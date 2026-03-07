import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '../api/auth'
import { 
  login as apiLogin, 
  signup as apiSignup, 
  logout as apiLogout, 
  checkSession, 
  clearAuth,
  getStoredUser
} from '../api/auth'
import { onAuthEvent } from '../api/authEvents'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  signup: (data: any) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    // Already loading? Avoid concurrent calls
    if (loading && user) return; 
    
    setLoading(true)
    try {
      console.log('AuthProvider: Triggering checkSession...');
      const result = await checkSession()
      if (result) {
        console.log('AuthProvider: session restored for', result.user.email);
        setUser(result.user)
      } else {
        console.log('AuthProvider: no session, clearing auth');
        setUser(null)
        clearAuth()
      }
    } catch (err) {
      console.error('Session restoration failed:', err)
      setUser(null)
      clearAuth()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial silent refresh
    refreshUser()

    // Listen for global unauthorized events (e.g. from api client)
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'unauthorized') {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (credentials: { email: string; password: string }) => {
    const result = await apiLogin(credentials)
    setUser(result.user)
  }

  const signup = async (data: any) => {
    const result = await apiSignup(data)
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
