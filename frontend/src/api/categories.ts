import { apiRequest } from './client'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  isCustom: boolean
}

export async function fetchCategories(type: 'expense' | 'income'): Promise<{ categories: Category[] }> {
  const url = type === 'income' ? '/api/income-categories' : '/api/categories'
  return apiRequest<{ categories: Category[] }>(url, {
    method: 'GET',
  })
}

export async function updateCategory(
  id: string,
  type: 'expense' | 'income',
  data: { name?: string; icon?: string; color?: string },
): Promise<{ category: Category }> {
  const url = type === 'income' ? `/api/income-categories/${id}` : `/api/categories/${id}`
  return apiRequest<{ category: Category }>(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string, type: 'expense' | 'income'): Promise<{ message: string }> {
  const url = type === 'income' ? `/api/income-categories/${id}` : `/api/categories/${id}`
  return apiRequest<{ message: string }>(url, {
    method: 'DELETE',
  })
}
