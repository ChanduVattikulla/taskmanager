import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tasks as tasksApi } from '../services/api'
import TaskCard from '../components/TaskCard'
import TaskFormModal from '../components/TaskFormModal'

const STATUSES = [
  { value: '', label: 'All tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SORTS = [
  { value: 'created_at', label: 'Newest first' },
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title A–Z' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [taskList, setTaskList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [allTags, setAllTags] = useState([])
  const [filterTag, setFilterTag] = useState('')

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {
        status: filterStatus, priority: filterPriority, tag: filterTag,
        search, sort_by: sortBy, sort_order: sortBy === 'title' ? 'asc' : 'desc',
        page, limit: 20,
      }
      const data = await tasksApi.list(params)
      setTaskList(data.tasks)
      setPagination(data.pagination)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filterStatus, filterPriority, filterTag, search, sortBy, page])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { tasksApi.getTags().then(d => setAllTags(d.tags)).catch(() => {}) }, [taskList])

  const handleToggle = async (id) => {
    try {
      const updated = await tasksApi.toggle(id)
      setTaskList(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await tasksApi.delete(id)
      setTaskList(prev => prev.filter(t => t.id !== id))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
    } catch (e) { setError(e.message) }
  }

  const handleFormSubmit = async (formData) => {
    try {
      if (editTask) {
        const updated = await tasksApi.update(editTask.id, formData)
        setTaskList(prev => prev.map(t => t.id === editTask.id ? updated : t))
      } else {
        await tasksApi.create(formData)
        setPage(1); fetchTasks()
      }
      setShowForm(false); setEditTask(null)
    } catch (e) { throw e }
  }

  const resetFilters = () => {
    setFilterStatus(''); setFilterPriority(''); setFilterTag(''); setSearch(''); setSortBy('created_at'); setPage(1)
  }

  const hasFilters = filterStatus || filterPriority || filterTag || search

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
          <span style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-0.02em' }}>✓ TaskFlow</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.name || user?.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            My tasks
            {pagination.total > 0 && <span style={{ fontWeight: '400', fontSize: '15px', color: 'var(--text-muted)', marginLeft: '8px' }}>({pagination.total})</span>}
          </h1>
          <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowForm(true) }}>+ New task</button>
        </div>

        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <input type="text" className="form-input" placeholder="Search tasks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ minWidth: '180px', flex: '1', maxWidth: '260px' }} />
            <select className="form-input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={{ width: 'auto' }}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="form-input" value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }} style={{ width: 'auto' }}>
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {allTags.length > 0 && (
              <select className="form-input" value={filterTag} onChange={e => { setFilterTag(e.target.value); setPage(1) }} style={{ width: 'auto' }}>
                <option value="">All tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select className="form-input" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} style={{ width: 'auto' }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {hasFilters && <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Clear filters</button>}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
        ) : taskList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">{hasFilters ? 'No tasks match your filters' : 'No tasks yet'}</div>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>
              {hasFilters
                ? <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Clear filters</button>
                : <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>Create your first task</button>}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {taskList.map(task => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onEdit={(t) => { setEditTask(t); setShowForm(true) }} onDelete={handleDelete} onClick={() => navigate(`/tasks/${task.id}`)} />
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {pagination.pages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
          </div>
        )}
      </main>

      {showForm && (
        <TaskFormModal task={editTask} onSubmit={handleFormSubmit} onClose={() => { setShowForm(false); setEditTask(null) }} />
      )}
    </div>
  )
}