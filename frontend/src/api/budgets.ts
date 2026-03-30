import { apiRequest } from './client'

export interface Budget {
  id: string
  amount: number
  startDate: string
  endDate: string
  warningThreshold: number
}

export interface CategoryBudget {
  id: string
  categoryId: string
  amount: number
  startDate: string
  endDate: string
  warningThreshold: number
  spent?: number
}

export async function setCategoryBudget(data: {
  categoryId: string
  amount: number
  startDate: string
  endDate: string
  warningThreshold?: number
}): Promise<{ budget: CategoryBudget }> {
  return apiRequest<{ budget: CategoryBudget }>('/api/category-budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchCategoryBudgets(): Promise<{
  budgets: CategoryBudget[]
}> {
  return apiRequest<{ budgets: CategoryBudget[] }>('/api/category-budgets', {
    method: 'GET',
  })
}

export async function removeCategoryBudget(categoryId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/category-budgets`, {
    method: 'DELETE',
    body: JSON.stringify({ categoryId }),
  })
}

export async function setBudget(data: {
  amount: number
  startDate: string
  endDate: string
  name?: string
  warningThreshold?: number
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
