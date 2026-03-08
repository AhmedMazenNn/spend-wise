import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User } from '../api/auth'
import { 
  login as apiLogin, 
  signup as apiSignup, 
  logout as apiLogout, 
  checkSession, 
  clearAuth,
  getStoredUser,
  googleAuth as apiGoogleAuth
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
  googleLogin: (credential: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [loading, setLoading] = useState(true)
  const isRefreshing = useRef(false)

  const refreshUser = async () => {
    if (isRefreshing.current) return
    isRefreshing.current = true
    
    console.log('[AuthProvider] refreshUser starting...');
    
    // Only set loading if we don't have a user yet (initial load)
    const hasExistingUser = !!user || !!getStoredUser();
    if (!hasExistingUser) {
      setLoading(true)
    }

    try {
      console.log('[AuthProvider] Triggering checkSession...');
      const result = await checkSession()
      if (result) {
        console.log('[AuthProvider] Session restored for:', result.user.email);
        setUser(result.user)
      } else {
        // If checkSession failed but we have a stored user, DON'T wipe immediately.
        // Let the subsequent API calls handle 401s if the token is truly dead.
        if (!hasExistingUser) {
          console.log('[AuthProvider] No session found, clearing state');
          setUser(null)
          clearAuth()
        } else {
          console.log('[AuthProvider] Refresh failed, but keeping existing session for now');
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
      console.log('[AuthProvider] loading set to false');
    }
  }

  useEffect(() => {
    // One-time cleanup of stale/conflicting keys from other sessions or older versions
    const cleanupStaleData = () => {
      const recognizedKeys = ['spendwise_token', 'spendwise_user', 'loglevel'];
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !recognizedKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        console.log('[AuthProvider] Cleaning up stale keys:', keysToRemove);
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    };

    cleanupStaleData();

    console.log('[AuthProvider] mounted');
    refreshUser()

    // Listen for global unauthorized events
    const unsubscribe = onAuthEvent((event) => {
      console.log('[AuthProvider] Auth Event received:', event);
      if (event === 'unauthorized') {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
      console.log('[AuthProvider] unmounted');
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

  const googleLogin = async (credential: string) => {
    const result = await apiGoogleAuth(credential)
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
