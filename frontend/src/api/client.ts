import { getToken, clearAuth, refreshAccessToken } from './auth'
import { emitAuthEvent } from './authEvents'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const makeHeaders = (tk: string | null) => {
    const h: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }
    if (tk) (h as Record<string, string>).Authorization = `Bearer ${tk}`
    return h
  }

  const doFetch = (tk: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: makeHeaders(tk),
      credentials: 'include',
    })

  let tk = token ?? getToken()
  let res = await doFetch(tk)
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) res = await doFetch(newToken)
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth()
      emitAuthEvent('unauthorized')
    }
    const msg = (data as { message?: string } | null)?.message ?? 'Request failed'
    throw new Error(msg)
  }
  return data as T
}
