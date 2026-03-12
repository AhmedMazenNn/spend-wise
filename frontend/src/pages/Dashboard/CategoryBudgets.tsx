import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from '../../components/Sidebar'
import { CategoryBudgetCard } from '../../components/CategoryBudgetCard'
import { useExpenseData } from '../../hooks/useExpenseData'
import { Target, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react'
import { fetchCategories } from '../../api/categories'
import type { Category } from '../../api/categories'
import { setCategoryBudget, fetchCategoryBudgets } from '../../api/budgets'
import type { CategoryBudget } from '../../api/budgets'

export function CategoryBudgetsPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({})
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null)

  // Use useExpenseData to get transactions for the current month
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: expenseData, loading: expensesLoading, refetch: refetchExpenses } = useExpenseData(
    'preset',
    'Month',
    { start: '', end: '' },
    currentMonthStr
  )

  const loadData = useCallback(async () => {
    try {
      const [{ categories: fetchedCats }, { budgets: fetchedBudgets }] = await Promise.all([
        fetchCategories(),
        fetchCategoryBudgets(),
      ])

      setCategories(fetchedCats)
      
      const budgetMap: Record<string, number> = {}
      fetchedBudgets.forEach((b: CategoryBudget) => {
        budgetMap[b.categoryId] = b.amount
      })
      setCategoryBudgets(budgetMap)
    } catch (error) {
      console.error('Failed to load category budget data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdateBudget = async (categoryName: string, amount: number | null) => {
    const category = categories.find((c) => c.name === categoryName)
    if (!category) return

    setUpdatingCategory(categoryName)
    try {
      if (amount === null) {
        // Technically our current backend model doesn't have a "delete/deactivate" for category budget specifically yet
        // but we can set it to 0 or just ignore for now if the user wants to remove it.
        // For simplicity, let's just set it to 0 if the backend supports it, or handle it as needed.
        // If the backend doesn't support deleting, we might want to add a deactivate endpoint.
        // Given setCategoryBudget is POST, we can just send amount: 0 to "unset" it effectively.
         await setCategoryBudget({
          categoryId: category.id,
          amount: 0,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        })
      } else {
        await setCategoryBudget({
          categoryId: category.id,
          amount,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        })
      }
      await loadData()
      await refetchExpenses()
    } catch (error) {
      console.error('Failed to update category budget:', error)
    } finally {
      setUpdatingCategory(null)
    }
  }

  // Calculate spent per category using real transactions
  const categorySpent = useMemo(() => {
    const spent: Record<string, number> = {}
    categories.forEach((c) => (spent[c.name] = 0))
    
    if (expenseData?.transactions) {
      expenseData.transactions.forEach((tx) => {
        if (spent[tx.category] !== undefined) {
          spent[tx.category] += tx.amount
        }
      })
    }
    return spent
  }, [categories, expenseData])

  // Calculate summaries
  const summaries = useMemo(() => {
    let totalBudgeted = 0
    let totalSpentInBudgeted = 0
    let overBudgetCount = 0

    categories.forEach(cat => {
      const budget = categoryBudgets[cat.id]
      if (budget && budget > 0) {
        totalBudgeted += budget
        const spent = categorySpent[cat.name] || 0
        totalSpentInBudgeted += spent
        if (spent > budget) {
          overBudgetCount++
        }
      }
    })

    return {
      totalBudgeted,
      totalSpentInBudgeted,
      overBudgetCount,
    }
  }, [categories, categoryBudgets, categorySpent])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  if (loading || expensesLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-8 pb-12"
        >
          {/* Header */}
          <motion.header variants={itemVariants}>
            <h1 className="text-3xl font-bold font-heading text-slate-900">
              Category Budgets
            </h1>
            <p className="text-slate-500 mt-1">
              Set spending limits for each category to stay on track
            </p>
          </motion.header>

          {/* Summary Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Budgeted
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900">
                  $
                  {summaries.totalBudgeted.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Spent in Budgets
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900">
                  $
                  {summaries.totalSpentInBudgeted.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-card flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${summaries.overBudgetCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Over Budget
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900">
                  {summaries.overBudgetCount}{' '}
                  {summaries.overBudgetCount === 1 ? 'Category' : 'Categories'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Budget Cards Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {categories.map((cat) => (
              <div key={cat.id} className="relative">
                {updatingCategory === cat.name && (
                  <div className="absolute inset-0 z-10 bg-white/50 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                )}
                <CategoryBudgetCard
                  category={cat.name}
                  emoji={cat.icon || '📦'}
                  color={cat.color}
                  spent={categorySpent[cat.name] || 0}
                  budget={categoryBudgets[cat.id] || null}
                  onUpdateBudget={handleUpdateBudget}
                />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
