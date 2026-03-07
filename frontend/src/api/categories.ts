import { apiRequest } from './client'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  isCustom: boolean
}

export async function fetchCategories(): Promise<{ categories: Category[] }> {
  return apiRequest<{ categories: Category[] }>('/api/categories', {
    method: 'GET',
  })
}

export async function updateCategory(
  id: string,
  data: { name?: string; icon?: string; color?: string },
): Promise<{ category: Category }> {
  return apiRequest<{ category: Category }>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
