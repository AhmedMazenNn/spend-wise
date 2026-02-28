import { apiRequest } from './client'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export async function fetchCategories(): Promise<{ categories: Category[] }> {
  return apiRequest<{ categories: Category[] }>('/api/categories', {
    method: 'GET',
  })
}
