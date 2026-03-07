// src/api/auth.ts
import { emitAuthEvent } from './authEvents'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  createdAt?: string
}

interface AuthResponse {
  user: User
  accessToken: string
  // You may not actually return refreshToken in JSON if you're using httpOnly cookies (recommended)
  refreshToken?: string
}

const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export function saveAuth(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.accessToken)
  if (auth.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken)
  }
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
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

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      // Send refresh token in body as fallback for blocked cookies
      body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
    })

    if (!res.ok) return null

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string } | null
    const newAccessToken = data?.accessToken
    if (!newAccessToken) return null

    localStorage.setItem(TOKEN_KEY, newAccessToken)
    // Update rotate refresh token if provided
    if (data?.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    }
    
    return newAccessToken
  } catch (err) {
    console.error('Refresh token failed:', err)
    return null
  }
}

/** 
 * Try to restore session by refreshing token. 
 * If successful, we fetch the profile to get fresh user data.
 */
export async function checkSession(): Promise<{ user: User, accessToken: string } | null> {
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

  const doFetch = async (tk?: string | null) => {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: makeHeaders(tk),
      credentials: 'include',
    })
  }

  let res = await doFetch(token)

  // ✅ If access token expired, try refresh ONCE then retry request
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
    // ✅ If still unauthorized, force logout + notify UI
    if (res.status === 401) {
      clearAuth()
      emitAuthEvent('unauthorized')
    }

    const message =
      (data as { message?: string } | null)?.message ?? 'Request failed'
    throw new Error(message)
  }

  return data as T
}

export async function signup(input: {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
}) {
  const data = await request<AuthResponse>(
    '/api/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    null,
  )

  saveAuth(data)
  return data
}

export async function login(input: { email: string; password: string }) {
  const data = await request<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    null,
  )

  saveAuth(data)
  return data
}

export async function googleAuth(credential: string) {
  const data = await request<AuthResponse>(
    '/api/auth/google',
    {
      method: 'POST',
      body: JSON.stringify({ credential, idToken: credential }),
    },
    null,
  )
  
  saveAuth(data)
  return data
}

export async function logout() {
  const token = getToken()

  // Clear local state no matter what (even if server call fails)
  try {
    if (token) {
      await request<{ message: string }>(
        '/api/auth/logout',
        { method: 'POST' },
        token,
      )
    }
  } finally {
    clearAuth()
  }
}

export async function fetchProfile() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ user: User }>(
    '/api/auth/profile',
    {
      method: 'GET',
    },
    token,
  )
}

export async function updateMe(updates: {
  name?: string
  email?: string
  phone?: string
}) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ user: User }>(
    '/api/users/me',
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
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
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  )
}

export async function deleteMe() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ message: string }>(
    '/api/users/me',
    {
      method: 'DELETE',
    },
    token,
  )
}

export async function getAllUsers() {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ count: number; users: User[] }>(
    '/api/users',
    {
      method: 'GET',
    },
    token,
  )
}

export async function updateUserByAdmin(
  userId: string,
  updates: {
    name?: string
    email?: string
    role?: string
    phone?: string
    password?: string
  },
) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ user: User }>(
    `/api/users/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
    token,
  )
}

export async function deleteUserByAdmin(userId: string) {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  return request<{ message: string }>(
    `/api/users/${userId}`,
    {
      method: 'DELETE',
    },
    token,
  )
}