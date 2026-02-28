import { apiRequest } from './client'
import { getToken } from './auth'

export interface Expense {
  id: string
  amount: number
  title: string
  note?: string
  category: string
  categoryId?: string
  date: string
  emoji: string
}

export async function createExpense(data: {
  amount: number
  title?: string
  note?: string
  date?: string
  categoryId: string
}): Promise<{ expense: Expense }> {
  return apiRequest<{ expense: Expense }>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchExpenses(params?: {
  period?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ expenses: Expense[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.limit != null) searchParams.set('limit', String(params.limit))
  if (params?.offset != null) searchParams.set('offset', String(params.offset))
  const qs = searchParams.toString()
  return apiRequest<{ expenses: Expense[]; total: number }>(
    `/api/expenses${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
}

export async function updateExpense(
  id: string,
  data: { amount?: number; title?: string; note?: string; date?: string; categoryId?: string },
): Promise<{ expense: Expense }> {
  return apiRequest<{ expense: Expense }>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteExpense(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/expenses/${id}`, {
    method: 'DELETE',
  })
}

export async function exportExpensesCsv(params?: {
  period?: string
  startDate?: string
  endDate?: string
  search?: string
}): Promise<Blob> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.search) searchParams.set('search', params.search)
  const qs = searchParams.toString()

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/api/expenses/export${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { message?: string })?.message ?? 'Export failed')
  }
  return res.blob()
}
