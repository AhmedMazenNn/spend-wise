import { apiRequest } from './client'

export interface Budget {
  id: string
  amount: number
  startDate: string
  endDate: string
}

export async function setBudget(data: {
  amount: number
  startDate: string
  endDate: string
  name?: string
}): Promise<{ budget: Budget }> {
  return apiRequest<{ budget: Budget }>('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchActiveBudget(): Promise<{ budget: Budget | null }> {
  return apiRequest<{ budget: Budget | null }>('/api/budgets/active', {
    method: 'GET',
  })
}

export async function removeBudget(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/budgets/${id}`, {
    method: 'DELETE',
  })
}
