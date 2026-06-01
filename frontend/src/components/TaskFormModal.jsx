import React, { useState, useEffect, useRef } from 'react'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled']

export default function TaskFormModal({ task, onSubmit, onClose }) {
  const isEdit = Boolean(task)
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [status, setStatus] = useState(task?.status || 'pending')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [tagsInput, setTagsInput] = useState(task?.tags ? task.tags.join(', ') : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const parseTags = (input) => input.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!title.trim()) { setError('Title is required.'); titleRef.current?.focus(); return }
    if (title.trim().length > 200) { setError('Title must be under 200 characters.'); return }
    setLoading(true)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || null, priority, status, due_date: dueDate || null, tags: parseTags(tagsInput) })
    } catch (e) { setError(e.message || 'Something went wrong.') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit task' : 'New task'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '18px', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input ref={titleRef} type="text" className="form-input" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="Add details or notes..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Priority</label>
                <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              {isEdit && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Due date</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
              <label className="form-label">Tags</label>
              <input type="text" className="form-input" placeholder="work, urgent, review (comma-separated)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
              {tagsInput && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {parseTags(tagsInput).map(t => <span key={t} className="badge badge-tag">{t}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" style={{ width: '14px', height: '14px' }} />}
              {isEdit ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}