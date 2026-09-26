import { useState, useEffect, useCallback } from 'react'
import {
  registerUser,
  loginUser,
  fetchCurrentUser,
  clearTokens,
  getToken,
} from '../api/places'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    fetchCurrentUser()
      .then((data) => {
        setUser(data.user || null)
      })
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const register = useCallback(async (username, password, email) => {
    const data = await registerUser(username, password, email)
    setUser(data.user)
    return data
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await loginUser(username, password)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  return { user, loading, register, login, logout }
}
