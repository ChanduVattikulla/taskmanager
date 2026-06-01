import React, { useState } from 'react'

function dueDateInfo(dateStr, status) {
  if (!dateStr || status === 'completed') return null
  const due = new Date(dateStr); const today = new Date()
  today.setHours(0,0,0,0); due.setHours(0,0,0,0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, color: 'var(--danger)' }
  if (diff === 0) return { label: 'Today', color: 'var(--warning)' }
  if (diff === 1) return { label: 'Tomorrow', color: 'var(--warning)' }
  if (diff <= 7) return { label: `${diff} days`, color: 'var(--text-muted)' }
  return { label: dateStr, color: 'var(--text-light)' }
}

export default function TaskCard({ task, onToggle, onEdit, onDelete, onClick }) {
  const [toggling, setToggling] = useState(false)
  const done = task.status === 'completed'
  const dueInfo = dueDateInfo(task.due_date, task.status)

  const handleToggle = async (e) => {
    e.stopPropagation(); if (toggling) return
    setToggling(true); await onToggle(task.id); setToggling(false)
  }

  return (
    <div className="card" onClick={onClick}
      style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', opacity: task.status === 'cancelled' ? 0.6 : 1, transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>

      <input type="checkbox" className="checkbox" style={{ marginTop: '2px' }} checked={done} onChange={handleToggle} disabled={toggling} onClick={e => e.stopPropagation()} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: '500', textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text)', fontSize: '15px', wordBreak: 'break-word' }}>
          {task.title}
        </span>
        {task.description && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.description}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
          <span className={`badge badge-${task.priority}`} style={{ fontSize: '11px' }}>{task.priority}</span>
          <span className={`badge badge-${task.status}`} style={{ fontSize: '11px' }}>{task.status.replace('_', ' ')}</span>
          {dueInfo && <span style={{ fontSize: '12px', color: dueInfo.color, fontWeight: '500' }}>{dueInfo.label}</span>}
          {task.tags && task.tags.slice(0, 3).map(t => <span key={t} className="badge badge-tag" style={{ fontSize: '11px' }}>{t}</span>)}
          {task.tags && task.tags.length > 3 && <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>+{task.tags.length - 3}</span>}
          {task.subtasks_count > 0 && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>· {task.subtasks_count} subtask{task.subtasks_count > 1 ? 's' : ''}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(task) }} title="Edit" style={{ color: 'var(--text-muted)' }}>✎</button>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onDelete(task.id) }} title="Delete" style={{ color: 'var(--danger)' }}>✕</button>
      </div>
    </div>
  )
}