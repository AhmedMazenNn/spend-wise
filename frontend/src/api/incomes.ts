import { apiRequest } from './client'

export interface Income {
  id: string
  title: string
  amount: number
  category: string
  emoji: string
  date: string
  frequency: 'one-time' | 'weekly' | 'monthly' | 'yearly'
  note?: string
  status: 'received' | 'pending' | 'expected'
  categoryId?: string
  categoryColor?: string
  categoryName?: string
  categoryIcon?: string
}

export interface IncomeResponse {
  incomes: Income[]
  total: number
}

interface FetchParams {
  period?: 'today' | 'week' | 'month' | 'all' | 'custom'
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}

export const fetchIncomes = async (params?: FetchParams): Promise<IncomeResponse> => {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.limit != null) searchParams.set('limit', String(params.limit))
  if (params?.offset != null) searchParams.set('offset', String(params.offset))
  const qs = searchParams.toString()
  
  return apiRequest<IncomeResponse>(`/api/incomes${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  })
}

export const createIncome = async (
  income: Omit<Income, 'id'>
): Promise<{ income: Income }> => {
  return apiRequest<{ income: Income }>('/api/incomes', {
    method: 'POST',
    body: JSON.stringify(income),
  })
}

export const updateIncome = async (
  id: string,
  updates: Partial<Omit<Income, 'id'>>
): Promise<{ income: Income }> => {
  return apiRequest<{ income: Income }>(`/api/incomes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export const deleteIncome = async (id: string): Promise<void> => {
  return apiRequest<void>(`/api/incomes/${id}`, {
    method: 'DELETE',
  })
}

export const exportIncomes = async (params: FetchParams): Promise<Blob> => {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.search) searchParams.set('search', params.search)
  
  const qs = searchParams.toString()
  // apiRequest handles JSON by default, for Blobs we might need to handle it differently 
  // but looking at client.ts: it always calls res.json().
  // If we need Blob, we might need to use fetch directly or modify client.ts.
  // However, looking at expenseController.js, export is a GET that returns CSV.
  // TransactionsPage doesn't seem to use exportIncomes yet, but I'll leave it as fetch for now if needed.
  const res = await fetch(`/api/incomes/export${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}` // Fallback approach for blob if apiRequest is json-only
    }
  })
  return res.blob()
}
