import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from '../../components/Sidebar'
import { CategoryBudgetCard } from '../../components/CategoryBudgetCard'
import { useExpenseData } from '../../hooks/useExpenseData'
import { Target, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react'
import { fetchCategories } from '../../api/categories'
import type { Category } from '../../api/categories'
import {
  setCategoryBudget,
  fetchCategoryBudgets,
  removeCategoryBudget,
} from '../../api/budgets'
import type { CategoryBudget } from '../../api/budgets'
import { useTranslation } from 'react-i18next'

export function CategoryBudgetsPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, CategoryBudget>>({})
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null)

  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const locale = isArabic ? 'ar-EG' : 'en-US'

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

      const budgetMap: Record<string, CategoryBudget> = {}
      fetchedBudgets.forEach((b: CategoryBudget) => {
        budgetMap[b.categoryId] = b
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

  const handleUpdateBudget = async (
    categoryName: string,
    amount: number | null,
    startDate: string,
    endDate: string,
    warningThreshold: number
  ) => {
    const category = categories.find((c) => c.name === categoryName)
    if (!category) return

    setUpdatingCategory(categoryName)

    try {
      await setCategoryBudget({
        categoryId: category.id,
        amount: amount ?? 0,
        startDate,
        endDate,
        warningThreshold,
      })

      await Promise.all([loadData(), refetchExpenses()])
    } catch (error) {
      console.error('Failed to update category budget:', error)
    } finally {
      setUpdatingCategory(null)
    }
  }

  const handleRemoveBudget = async (categoryName: string) => {
    const category = categories.find((c) => c.name === categoryName)
    if (!category) return

    setUpdatingCategory(categoryName)

    try {
      await removeCategoryBudget(category.id)
      await Promise.all([loadData(), refetchExpenses()])
    } catch (error) {
      console.error('Failed to remove category budget:', error)
    } finally {
      setUpdatingCategory(null)
    }
  }

  const categorySpent = useMemo(() => {
    const spent: Record<string, number> = {}

    categories.forEach((c) => {
      spent[c.name] = 0
    })

    if (expenseData?.transactions) {
      expenseData.transactions.forEach((tx) => {
        if (spent[tx.category] !== undefined) {
          spent[tx.category] += tx.amount
        }
      })
    }

    return spent
  }, [categories, expenseData])

  const summaries = useMemo(() => {
    let totalBudgeted = 0
    let totalSpentInBudgeted = 0
    let overBudgetCount = 0

    categories.forEach((cat) => {
      const budget = categoryBudgets[cat.id]

      if (budget?.amount && budget.amount > 0) {
        totalBudgeted += budget.amount
        const spent = categorySpent[cat.name] || 0
        totalSpentInBudgeted += spent

        if (spent > budget.amount) {
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
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <Sidebar />
        <main
          dir={isArabic ? 'rtl' : 'ltr'}
          className={`flex-1 w-full min-w-0 ${
            isArabic ? 'lg:mr-64' : 'lg:ml-64'
          } flex items-center justify-center p-4`}
        >
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`flex-1 w-full min-w-0 ${
          isArabic ? 'lg:mr-64' : 'lg:ml-64'
        } p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen`}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-8 pb-12 pt-16 lg:pt-0"
        >
          <motion.header variants={itemVariants} className="space-y-1">
            <h1 className="text-3xl font-bold font-heading text-slate-900 dark:text-white">
              {t('Category Budgets')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {t('Set spending limits for each category to stay on track')}
            </p>
          </motion.header>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-blue-100/50 dark:shadow-none border border-blue-100/50 dark:border-slate-700/50 hover:border-blue-200 transition-all flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  {t('Total Budgeted')}
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  ${summaries.totalBudgeted.toLocaleString(locale, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  {t('The sum of all monthly limits you have set across your categories')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-emerald-100/50 dark:shadow-none border border-emerald-100/50 dark:border-slate-700/50 hover:border-emerald-200 transition-all flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                <TrendingDown className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  {t('Spent in Budgets')}
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  ${summaries.totalSpentInBudgeted.toLocaleString(locale, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  {t('Amount spent so far this month only in categories with an active budget')}
                </p>
              </div>
            </div>

            <div
              className={`bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-6 shadow-lg transition-all flex items-center gap-5 border ${
                summaries.overBudgetCount > 0
                  ? 'shadow-red-50/50 dark:shadow-none border-red-100/50 dark:border-red-900/30 hover:border-red-200'
                  : 'shadow-slate-100/50 dark:shadow-none border-slate-100/50 dark:border-slate-700/50 hover:border-slate-200'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  summaries.overBudgetCount > 0
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                    summaries.overBudgetCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('Over Budget')}
                </p>
                <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  {summaries.overBudgetCount}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    {summaries.overBudgetCount === 1 ? t('Category') : t('Categories')}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  {t('Number of categories where your actual spending has exceeded the set limit')}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {categories.map((cat) => (
              <div key={cat.id} className="relative">
                {updatingCategory === cat.name && (
                  <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                )}

                <CategoryBudgetCard
                  category={cat.name}
                  emoji={cat.icon || '📦'}
                  color={cat.color}
                  spent={categorySpent[cat.name] || 0}
                  budget={categoryBudgets[cat.id]?.amount || null}
                  warningThreshold={categoryBudgets[cat.id]?.warningThreshold || 70}
                  startDate={categoryBudgets[cat.id]?.startDate || null}
                  endDate={categoryBudgets[cat.id]?.endDate || null}
                  onUpdateBudget={handleUpdateBudget}
                  onRemoveBudget={handleRemoveBudget}
                />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}