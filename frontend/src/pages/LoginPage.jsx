import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here') return
    const renderBtn = () => {
      if (!googleBtnRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError(''); setLoading(true)
          try { await googleLogin(response.credential); navigate('/dashboard') }
          catch (e) { setError(e.message || 'Google login failed') }
          finally { setLoading(false) }
        },
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: '100%', text: 'continue_with',
      })
    }
    if (window.google) renderBtn()
    else { window.addEventListener('load', renderBtn); return () => window.removeEventListener('load', renderBtn) }
  }, [GOOGLE_CLIENT_ID, mode])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    if (mode === 'register') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
      navigate('/dashboard')
    } catch (e) { setError(e.message || 'Something went wrong.') }
    finally { setLoading(false) }
  }

  const showGoogle = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your-google-client-id-here'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em' }}>TaskFlow</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Keep your work organised</p>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent', color: mode === m ? 'var(--accent)' : 'var(--text-muted)', fontWeight: mode === m ? '600' : '400', fontSize: '14px', cursor: 'pointer', marginBottom: '-1px' }}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-input" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '4px' }}>
              {loading && <span className="spinner" style={{ width: '16px', height: '16px' }} />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {showGoogle && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.25rem 0' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
                <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>or</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
              </div>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'login'
            ? <>Don't have an account? <button onClick={() => setMode('register')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Sign up</button></>
            : <>Already have an account? <button onClick={() => setMode('login')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Sign in</button></>
          }
        </p>
      </div>
    </div>
  )
}