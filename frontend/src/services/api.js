const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() { return localStorage.getItem('access_token') }
function getRefreshToken() { return localStorage.getItem('refresh_token') }

function setTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refresh}` },
  })
  if (!res.ok) { clearTokens(); throw new Error('Session expired') }
  const data = await res.json()
  localStorage.setItem('access_token', data.access_token)
  return data.access_token
}

async function request(method, path, body = null, retry = true) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const config = { method, headers }
  if (body !== null) config.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, config)

  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...config, headers })
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || 'Request failed')
      }
      if (retryRes.status === 204) return null
      return retryRes.json()
    } catch {
      clearTokens()
      window.location.href = '/'
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({ error: 'Invalid response' }))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const auth = {
  register: (email, password, name) => request('POST', '/auth/register', { email, password, name }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  googleLogin: (token) => request('POST', '/auth/google', { token }),
  me: () => request('GET', '/auth/me'),
  logout: () => { clearTokens() },
  setTokens,
  getToken,
  clearTokens,
}

export const tasks = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString()
    return request('GET', `/tasks${qs ? '?' + qs : ''}`)
  },
  get: (id) => request('GET', `/tasks/${id}`),
  create: (data) => request('POST', '/tasks', data),
  update: (id, data) => request('PATCH', `/tasks/${id}`, data),
  delete: (id) => request('DELETE', `/tasks/${id}`),
  toggle: (id) => request('PATCH', `/tasks/${id}/toggle`),
  createSubtask: (parentId, data) => request('POST', `/tasks/${parentId}/subtasks`, data),
  getTags: () => request('GET', '/tasks/tags/all'),
}