import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = auth.getToken()
    if (!token) { setLoading(false); return }
    try {
      const data = await auth.me()
      setUser(data.user)
    } catch {
      auth.clearTokens()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const data = await auth.login(email, password)
    auth.setTokens(data.access_token, data.refresh_token)
    setUser(data.user)
    return data.user
  }

  const register = async (email, password, name) => {
    const data = await auth.register(email, password, name)
    auth.setTokens(data.access_token, data.refresh_token)
    setUser(data.user)
    return data.user
  }

  const googleLogin = async (token) => {
    const data = await auth.googleLogin(token)
    auth.setTokens(data.access_token, data.refresh_token)
    setUser(data.user)
    return data.user
  }

  const logout = () => { auth.logout(); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}