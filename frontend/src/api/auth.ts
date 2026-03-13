// src/api/auth.ts
import { emitAuthEvent } from './authEvents'

const API_BASE = ''

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  picture?: string
  isVerified?: boolean
  provider?: string
  createdAt?: string
  hasSeenOnboarding?: boolean
}

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken?: string
}

interface SignupResponse {
  requiresVerification: boolean
  email: string
}

const TOKEN_KEY = 'spendwise_token'
const USER_KEY = 'spendwise_user'

export function saveAuth(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    console.log('[Auth] Refresh already in progress, returning existing promise')
    return refreshPromise
  }

  console.log('[Auth] Starting refreshAccessToken flow...')
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      console.log(`[Auth] Refresh response status: ${res.status}`)

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[Auth] Refresh failed (401). Cookie might be stale or missing.')
        }
        return null
      }

      const data = (await res.json()) as { accessToken?: string } | null
      const newAccessToken = data?.accessToken

      if (!newAccessToken) {
        console.error('[Auth] Refresh succeeded but no accessToken in response')
        return null
      }

      console.log('[Auth] Refresh successful, saving new accessToken')
      localStorage.setItem(TOKEN_KEY, newAccessToken)
      return newAccessToken
    } catch (err) {
      console.error('[Auth] Refresh failed:', err)
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function checkSession(): Promise<{ user: User; accessToken: string } | null> {
  const token = await refreshAccessToken()
  if (!token) return null
  try {
    const profile = await fetchProfile()
    return { user: profile.user, accessToken: token }
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  token?: string | null,
): Promise<T> {
  const makeHeaders = (tk?: string | null): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }
    if (tk) {
      ;(headers as Record<string, string>).Authorization = `Bearer ${tk}`
    }
    return headers
  }

  const doFetch = async (tk?: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: makeHeaders(tk),
      credentials: 'include',
    })

  let res = await doFetch(token)

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await doFetch(newToken)
    }
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // ignore JSON parse errors for empty bodies
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth()
      emitAuthEvent('unauthorized')
    }
    const message = (data as { message?: string } | null)?.message ?? 'Request failed'
    throw new Error(message)
  }

  return data as T
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

/**
 * Register a new user with email/password.
 * Returns { requiresVerification: true, email } — no tokens are issued yet.
 * The user must click the email verification link before they can log in.
 */
export async function signup(input: {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
}): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data?.message ?? 'Registration failed') as any
    err.errors = data?.errors || []
    throw err
  }

  // Never call saveAuth here — user is unverified
  return data as SignupResponse
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const data = await res.json()

  if (!res.ok) {
    // Attach requiresVerification so callers can surface the right UI
    const err = new Error(data?.message ?? 'Login failed') as Error & {
      requiresVerification?: boolean
      email?: string
    }
    err.requiresVerification = data?.requiresVerification ?? false
    err.email = data?.email
    throw err
  }

  saveAuth(data as AuthResponse)
  return data as AuthResponse
}

/**
 * Verify email address using the raw token from the verification link.
 * On success the server issues tokens → we call saveAuth().
 */
export async function verifyEmail(rawToken: string): Promise<AuthResponse & { alreadyVerified?: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`,
    { method: 'GET', credentials: 'include' }
  )

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data?.message ?? 'Verification failed') as Error & {
      expired?: boolean
      email?: string
    }
    err.expired = data?.expired ?? false
    err.email = data?.email
    throw err
  }

  saveAuth(data as AuthResponse)
  return data as AuthResponse & { alreadyVerified?: boolean }
}

/** Resend the verification email to the given address. */
export async function resendVerification(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.message ?? 'Failed to resend verification email')
  }

  return data
}

/**
 * Google OAuth — intent-aware.
 * @param credential  Google ID token from GSI
 * @param intent      'login' (login page) | 'register' (register page)
 */
export async function googleAuth(credential: string, intent: 'login' | 'register') {
  const data = await request<AuthResponse>(
    '/api/auth/google',
    {
      method: 'POST',
      body: JSON.stringify({ idToken: credential, intent }),
    },
    null,
  )
  saveAuth(data)
  return data
}

export async function logout() {
  const token = getToken()
  try {
    if (token) {
      await request<{ message: string }>('/api/auth/logout', { method: 'POST' }, token)
    }
  } finally {
    clearAuth()
  }
}

export async function fetchProfile() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ user: User }>('/api/auth/profile', { method: 'GET' }, token)
}

export async function updateMe(updates: { name?: string; email?: string; phone?: string }) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ user: User }>(
    '/api/users/me',
    { method: 'PATCH', body: JSON.stringify(updates) },
    token,
  )
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ message: string }>(
    '/api/auth/change-password',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  )
}

export async function deleteMe() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ message: string }>('/api/users/me', { method: 'DELETE' }, token)
}

export async function getAllUsers() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ count: number; users: User[] }>('/api/users', { method: 'GET' }, token)
}

export async function updateUserByAdmin(
  userId: string,
  updates: { name?: string; email?: string; role?: string; phone?: string; password?: string },
) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ user: User }>(
    `/api/users/${userId}`,
    { method: 'PATCH', body: JSON.stringify(updates) },
    token,
  )
}

export async function deleteUserByAdmin(userId: string) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return request<{ message: string }>(`/api/users/${userId}`, { method: 'DELETE' }, token)
}

export async function completeOnboarding(): Promise<{ message: string }> {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  const res = await request<{ message: string }>(
    '/api/auth/onboarding',
    { method: 'PATCH' },
    token,
  )

  // Update local storage user object
  const user = getStoredUser()
  if (user) {
    user.hasSeenOnboarding = true
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  return res
}