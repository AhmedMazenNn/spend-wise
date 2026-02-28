import { useState, useEffect, useCallback } from 'react'
import { fetchDashboard } from '../api/dashboard'
import type { DashboardPeriod } from '../api/dashboard'

export type TimePeriod = 'Today' | 'Week' | 'Month' | 'All'

const PERIOD_MAP: Record<TimePeriod, DashboardPeriod> = {
  Today: 'today',
  Week: 'week',
  Month: 'month',
  All: 'all',
}

export interface Budget {
  amount: number
  startDate: string
  endDate: string
  id?: string
}

export interface BudgetStats {
  spentInBudget: number
  percentage: number
  remaining: number
  isOver: boolean
}

export function useExpenseData(
  filterMode: 'preset' | 'custom',
  selectedPeriod: TimePeriod,
  customRange: { start: string; end: string },
) {
  const [data, setData] = useState<{
    stats: { totalSpent: number; count: number; dailyAvg: number; highest: number; topCategory: string | null }
    dailySpending: { date: string; amount: number }[]
    categoryData: { name: string; value: number; color: string }[]
    transactions: { id: string; amount: number; title: string; category: string; date: string; emoji: string }[]
    activeBudget: Budget | null
    budgetStats: BudgetStats | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { period: DashboardPeriod; startDate?: string; endDate?: string } =
        filterMode === 'custom'
          ? { period: 'custom', startDate: customRange.start, endDate: customRange.end }
          : { period: PERIOD_MAP[selectedPeriod] }

      const res = await fetchDashboard(params)
      setData({
        stats: res.stats,
        dailySpending: res.dailySpending,
        categoryData: res.categoryData,
        transactions: res.recentExpenses,
        activeBudget: res.activeBudget
          ? {
              id: res.activeBudget.id,
              amount: res.activeBudget.amount,
              startDate: res.activeBudget.startDate,
              endDate: res.activeBudget.endDate,
            }
          : null,
        budgetStats: res.activeBudget
          ? {
              spentInBudget: res.activeBudget.spentInBudget,
              percentage: res.activeBudget.percentage,
              remaining: res.activeBudget.remaining,
              isOver: res.activeBudget.isOver,
            }
          : null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filterMode, selectedPeriod, customRange.start, customRange.end])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
