import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tasks as tasksApi } from '../services/api'
import TaskFormModal from '../components/TaskFormModal'

function dueDateLabel(dateStr, status) {
  if (!dateStr || status === 'completed') return null
  const due = new Date(dateStr); const today = new Date()
  today.setHours(0,0,0,0); due.setHours(0,0,0,0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`, color: 'var(--danger)' }
  if (diff === 0) return { label: 'Due today', color: 'var(--warning)' }
  if (diff === 1) return { label: 'Due tomorrow', color: 'var(--warning)' }
  return { label: `Due ${dateStr}`, color: 'var(--text-muted)' }
}

function SubtaskRow({ subtask, onToggle, onDelete }) {
  const [toggling, setToggling] = useState(false)
  const done = subtask.status === 'completed'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <input type="checkbox" className="checkbox" checked={done} onChange={async () => { setToggling(true); await onToggle(subtask.id); setToggling(false) }} disabled={toggling} />
      <span style={{ flex: 1, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text)', fontSize: '14px' }}>{subtask.title}</span>
      <span className={`badge badge-${subtask.priority}`} style={{ fontSize: '11px' }}>{subtask.priority}</span>
      {subtask.due_date && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtask.due_date}</span>}
      <button className="btn btn-ghost btn-sm" onClick={() => onDelete(subtask.id)} style={{ color: 'var(--danger)', padding: '2px 6px' }}>✕</button>
    </div>
  )
}

function AddSubtaskForm({ onAdd }) {
  const [title, setTitle] = useState(''); const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!title.trim()) return
    setLoading(true)
    try { await onAdd({ title: title.trim() }); setTitle('') }
    finally { setLoading(false) }
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
      <input type="text" className="form-input" placeholder="Add a subtask..." value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1 }} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !title.trim()}>Add</button>
    </form>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams(); const navigate = useNavigate()
  const [task, setTask] = useState(null); const [loading, setLoading] = useState(true)
  const [error, setError] = useState(''); const [showEdit, setShowEdit] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { const data = await tasksApi.get(id); setTask(data) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleToggle = async (taskId) => {
    const updated = await tasksApi.toggle(taskId)
    if (taskId === id) setTask(prev => ({ ...prev, ...updated }))
    else setTask(prev => ({ ...prev, subtasks: prev.subtasks.map(s => s.id === taskId ? { ...s, ...updated } : s) }))
  }

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Delete this subtask?')) return
    await tasksApi.delete(subtaskId)
    setTask(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== subtaskId), subtasks_count: prev.subtasks_count - 1 }))
  }

  const handleAddSubtask = async (data) => {
    const subtask = await tasksApi.createSubtask(id, data)
    setTask(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), subtask], subtasks_count: (prev.subtasks_count || 0) + 1 }))
  }

  const handleUpdate = async (formData) => {
    const updated = await tasksApi.update(id, formData)
    setTask(prev => ({ ...prev, ...updated })); setShowEdit(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task and all its subtasks?')) return
    await tasksApi.delete(id); navigate('/dashboard')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><span className="spinner" /></div>
  if (error || !task) return <div className="container" style={{ paddingTop: '2rem' }}><div className="alert alert-error">{error || 'Task not found'}</div><button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>← Back</button></div>

  const dueInfo = dueDateLabel(task.due_date, task.status)
  const done = task.status === 'completed'
  const completedSubtasks = (task.subtasks || []).filter(s => s.status === 'completed').length
  const totalSubtasks = (task.subtasks || []).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: '52px', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Back</button>
          <span style={{ color: 'var(--border)', fontSize: '20px' }}>|</span>
          <span style={{ fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
        </div>
      </header>

      <main className="container" style={{ padding: '1.5rem 1rem', maxWidth: '700px' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1rem' }}>
            <input type="checkbox" className="checkbox" style={{ marginTop: '3px' }} checked={done} onChange={() => handleToggle(id)} />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '20px', fontWeight: '600', textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text)', lineHeight: '1.35' }}>{task.title}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                <span className={`badge badge-${task.priority}`}>{task.priority} priority</span>
                {dueInfo && <span style={{ fontSize: '13px', color: dueInfo.color, fontWeight: '500' }}>{dueInfo.label}</span>}
                {task.tags && task.tags.map(t => <span key={t} className="badge badge-tag">{t}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </div>
          </div>

          {task.description && (
            <>
              <hr className="divider" />
              <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{task.description}</div>
            </>
          )}

          <div style={{ marginTop: '1rem', fontSize: '12px', color: 'var(--text-light)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>Created: {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {task.completed_at && <span>Completed: {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>
              Subtasks
              {totalSubtasks > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '6px', fontSize: '13px' }}>{completedSubtasks}/{totalSubtasks} done</span>}
            </h2>
          </div>

          {totalSubtasks > 0 && (
            <div style={{ background: 'var(--border-light)', borderRadius: '10px', height: '4px', marginBottom: '10px' }}>
              <div style={{ background: 'var(--success)', borderRadius: '10px', height: '100%', width: `${(completedSubtasks / totalSubtasks) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          )}

          {(task.subtasks || []).length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>No subtasks yet.</p>}
          {(task.subtasks || []).map(s => (
            <SubtaskRow key={s.id} subtask={s} onToggle={handleToggle} onDelete={handleDeleteSubtask} />
          ))}
          <AddSubtaskForm onAdd={handleAddSubtask} />
        </div>
      </main>

      {showEdit && <TaskFormModal task={task} onSubmit={handleUpdate} onClose={() => setShowEdit(false)} />}
    </div>
  )
}