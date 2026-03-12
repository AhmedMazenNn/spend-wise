import { apiRequest } from './client'

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all' | 'custom'

export interface DashboardStats {
  totalSpent: number
  count: number
  dailyAvg: number
  highest: number
  topCategory: string | null
}

export interface DashboardResponse {
  stats: DashboardStats
  dailySpending: { date: string; amount: number }[]
  categoryData: { name: string; value: number; color: string }[]
  recentExpenses: {
    id: string
    amount: number
    title: string
    category: string
    date: string
    emoji: string
  }[]
  activeBudget: {
    id: string
    amount: number
    startDate: string
    endDate: string
    spentInBudget: number
    percentage: number
    remaining: number
    isOver: boolean
    warningThreshold: number
    isWarning: boolean
  } | null
}

export async function fetchDashboard(params?: {
  period?: DashboardPeriod
  startDate?: string
  endDate?: string
}): Promise<DashboardResponse> {
  const search = new URLSearchParams()
  if (params?.period) search.set('period', params.period)
  if (params?.startDate) search.set('startDate', params.startDate)
  if (params?.endDate) search.set('endDate', params.endDate)
  const qs = search.toString()
  return apiRequest<DashboardResponse>(`/api/dashboard${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  })
}
