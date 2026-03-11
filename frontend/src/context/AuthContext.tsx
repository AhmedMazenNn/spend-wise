// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User } from '../api/auth'
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  checkSession,
  clearAuth,
  getStoredUser,
  googleAuth as apiGoogleAuth,
} from '../api/auth'
import { onAuthEvent } from '../api/authEvents'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  /** Returns { requiresVerification, email } — does NOT set user on success */
  signup: (data: {
    name: string
    email: string
    password: string
    confirmPassword: string
    phone: string
  }) => Promise<{ requiresVerification: boolean; email: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  /** intent-aware Google login: 'login' page or 'register' page */
  googleLogin: (credential: string, intent: 'login' | 'register') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [loading, setLoading] = useState(true)
  const isRefreshing = useRef(false)

  const refreshUser = async () => {
    if (isRefreshing.current) return
    isRefreshing.current = true

    console.log('[AuthProvider] refreshUser starting...')

    const hasExistingUser = !!user || !!getStoredUser()
    if (!hasExistingUser) setLoading(true)

    try {
      console.log('[AuthProvider] Triggering checkSession...')
      const result = await checkSession()
      if (result) {
        console.log('[AuthProvider] Session restored for:', result.user.email)
        setUser(result.user)
      } else {
        if (!hasExistingUser) {
          console.log('[AuthProvider] No session found, clearing state')
          setUser(null)
          clearAuth()
        } else {
          console.log('[AuthProvider] Refresh failed, but keeping existing session for now')
        }
      }
    } catch (err) {
      console.error('[AuthProvider] Session restoration failed:', err)
      if (!hasExistingUser) {
        setUser(null)
        clearAuth()
      }
    } finally {
      setLoading(false)
      isRefreshing.current = false
      console.log('[AuthProvider] loading set to false')
    }
  }

  useEffect(() => {
    // One-time cleanup of stale/conflicting keys from older versions
    const cleanupStaleData = () => {
      const recognized = ['spendwise_token', 'spendwise_user', 'loglevel']
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !recognized.includes(key)) toRemove.push(key)
      }
      if (toRemove.length > 0) {
        console.log('[AuthProvider] Cleaning up stale keys:', toRemove)
        toRemove.forEach((k) => localStorage.removeItem(k))
      }
    }

    cleanupStaleData()
    console.log('[AuthProvider] mounted')
    refreshUser()

    const unsubscribe = onAuthEvent((event) => {
      console.log('[AuthProvider] Auth Event received:', event)
      if (event === 'unauthorized') setUser(null)
    })

    return () => {
      unsubscribe()
      console.log('[AuthProvider] unmounted')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (credentials: { email: string; password: string }) => {
    const result = await apiLogin(credentials)
    setUser(result.user)
  }

  /** Signup: do NOT set user — account is unverified until email is confirmed. */
  const signup = async (data: {
    name: string
    email: string
    password: string
    confirmPassword: string
    phone: string
  }) => {
    return apiSignup(data) // returns { requiresVerification, email }
  }

  const googleLogin = async (credential: string, intent: 'login' | 'register') => {
    const result = await apiGoogleAuth(credential, intent)
    setUser(result.user)
  }

  const logout = async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
