import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('ej_token'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => logout())
    }
  }, [token])

  const login = (t) => {
    localStorage.setItem('ej_token', t)
    setToken(t)
  }

  const logout = () => {
    localStorage.removeItem('ej_token')
    setToken(null)
    setUser(null)
  }

  const refreshUser = () => api.get('/auth/me').then(r => setUser(r.data))

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
