from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.task import Task, Tag
from extensions import db
from datetime import datetime

tasks_bp = Blueprint("tasks", __name__)

VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"]
VALID_PRIORITIES = ["low", "medium", "high"]
VALID_SORT_FIELDS = ["created_at", "due_date", "priority", "title"]


def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


@tasks_bp.route("", methods=["POST"])
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    if len(title) > 200:
        return jsonify({"error": "Title too long"}), 400

    status = data.get("status", "pending")
    if status not in VALID_STATUSES:
        status = "pending"

    priority = data.get("priority", "medium")
    if priority not in VALID_PRIORITIES:
        priority = "medium"

    parent_task_id = data.get("parent_task_id")
    if parent_task_id:
        parent = Task.query.filter_by(id=parent_task_id, user_id=user_id, is_deleted=False).first()
        if not parent:
            return jsonify({"error": "Parent task not found"}), 404
        if parent.parent_task_id:
            return jsonify({"error": "Subtasks cannot have subtasks"}), 400

    task = Task(
        user_id=user_id,
        title=title,
        description=(data.get("description") or "").strip() or None,
        status=status,
        priority=priority,
        due_date=parse_date(data.get("due_date")),
        parent_task_id=parent_task_id,
    )
    db.session.add(task)
    db.session.flush()

    tags_input = data.get("tags", [])
    if isinstance(tags_input, list):
        seen = set()
        for tag_name in tags_input:
            name = str(tag_name).strip().lower()[:100]
            if name and name not in seen:
                seen.add(name)
                db.session.add(Tag(task_id=task.id, name=name))

    db.session.commit()
    return jsonify(task.to_dict(include_subtasks=True)), 201


@tasks_bp.route("", methods=["GET"])
@jwt_required()
def list_tasks():
    user_id = get_jwt_identity()

    status_filter = request.args.get("status")
    priority_filter = request.args.get("priority")
    tag_filter = request.args.get("tag")
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort_by", "created_at")
    sort_order = request.args.get("sort_order", "desc")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 20))))
    parent_only = request.args.get("parent_only", "true").lower() == "true"

    query = Task.query.filter_by(user_id=user_id, is_deleted=False)

    if parent_only:
        query = query.filter(Task.parent_task_id.is_(None))

    if status_filter and status_filter in VALID_STATUSES:
        query = query.filter(Task.status == status_filter)

    if priority_filter and priority_filter in VALID_PRIORITIES:
        query = query.filter(Task.priority == priority_filter)

    if tag_filter:
        query = query.join(Tag).filter(Tag.name == tag_filter.lower().strip())

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Task.title.ilike(like), Task.description.ilike(like))
        )

    if sort_by not in VALID_SORT_FIELDS:
        sort_by = "created_at"

    col_map = {
        "created_at": Task.created_at,
        "due_date": Task.due_date,
        "title": Task.title,
        "priority": Task.priority,
    }
    col = col_map[sort_by]

    if sort_order == "asc":
        query = query.order_by(col.asc().nullslast())
    else:
        query = query.order_by(col.desc().nullslast())

    total = query.count()
    tasks = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        "tasks": [t.to_dict() for t in tasks],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max(1, (total + limit - 1) // limit),
        },
    }), 200


@tasks_bp.route("/tags/all", methods=["GET"])
@jwt_required()
def get_all_tags():
    user_id = get_jwt_identity()
    tags = (
        db.session.query(Tag.name)
        .join(Task)
        .filter(Task.user_id == user_id, Task.is_deleted == False)
        .distinct()
        .all()
    )
    return jsonify({"tags": [t.name for t in tags]}), 200


@tasks_bp.route("/<task_id>", methods=["GET"])
@jwt_required()
def get_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict(include_subtasks=True)), 200


@tasks_bp.route("/<task_id>", methods=["PATCH"])
@jwt_required()
def update_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify({"error": "Title cannot be empty"}), 400
        task.title = title[:200]

    if "description" in data:
        task.description = (data["description"] or "").strip() or None

    if "status" in data and data["status"] in VALID_STATUSES:
        old_status = task.status
        task.status = data["status"]
        if data["status"] == "completed" and old_status != "completed":
            task.completed_at = datetime.utcnow()
        elif data["status"] != "completed":
            task.completed_at = None

    if "priority" in data and data["priority"] in VALID_PRIORITIES:
        task.priority = data["priority"]

    if "due_date" in data:
        task.due_date = parse_date(data["due_date"])

    if "tags" in data:
        Tag.query.filter_by(task_id=task.id).delete()
        tags_input = data["tags"]
        if isinstance(tags_input, list):
            seen = set()
            for tag_name in tags_input:
                name = str(tag_name).strip().lower()[:100]
                if name and name not in seen:
                    seen.add(name)
                    db.session.add(Tag(task_id=task.id, name=name))

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(task.to_dict(include_subtasks=True)), 200


@tasks_bp.route("/<task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    now = datetime.utcnow()
    task.is_deleted = True
    task.deleted_at = now
    for subtask in task.subtasks:
        subtask.is_deleted = True
        subtask.deleted_at = now

    db.session.commit()
    return "", 204


@tasks_bp.route("/<task_id>/toggle", methods=["PATCH"])
@jwt_required()
def toggle_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id, is_deleted=False).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if task.status == "completed":
        task.status = "pending"
        task.completed_at = None
    else:
        task.status = "completed"
        task.completed_at = datetime.utcnow()

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(task.to_dict()), 200


@tasks_bp.route("/<parent_id>/subtasks", methods=["POST"])
@jwt_required()
def create_subtask(parent_id):
    user_id = get_jwt_identity()
    parent = Task.query.filter_by(id=parent_id, user_id=user_id, is_deleted=False).first()
    if not parent:
        return jsonify({"error": "Parent task not found"}), 404
    if parent.parent_task_id:
        return jsonify({"error": "Cannot create subtask of a subtask"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    subtask = Task(
        user_id=user_id,
        parent_task_id=parent_id,
        title=title[:200],
        description=(data.get("description") or "").strip() or None,
        status=data.get("status", "pending"),
        priority=data.get("priority", "medium"),
        due_date=parse_date(data.get("due_date")),
    )
    db.session.add(subtask)
    db.session.commit()
    return jsonify(subtask.to_dict()), 201