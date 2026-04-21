import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Plus, X, Wallet, Trash2, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Sidebar } from '../../components/Sidebar'
import { AddExpenseModal } from '../../components/AddExpenseModal'
import Onboarding from '../../components/Onboarding'
import { useExpenseData, type TimePeriod } from '../../hooks/useExpenseData'
import { type DashboardStats } from '../../api/dashboard'
import { getStoredUser } from '../../api/auth'
import { setBudget, removeBudget } from '../../api/budgets'
import { LoadingScreen } from '../../components/LoadingScreen'

type FilterMode = 'preset' | 'custom'

const getGreeting = (t: any) => {
  const h = new Date().getHours()
  if (h < 12) return t('Good morning')
  if (h < 17) return t('Good afternoon')
  return t('Good evening')
}

function Home() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const locale = isArabic ? 'ar-EG' : 'en-US'
  const user = getStoredUser()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [showExpiryConfirm, setShowExpiryConfirm] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!user?.hasSeenOnboarding)

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [filterMode, setFilterMode] = useState<FilterMode>('preset')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Month')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const [tempBudget, setTempBudget] = useState({
    amount: 1000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 30))
      .toISOString()
      .split('T')[0],
    warningThreshold: 70,
  })

  const { data, loading, error, refetch } = useExpenseData(
    filterMode,
    selectedPeriod,
    customRange,
    selectedMonth,
  )

  const handleExpenseAdded = () => {
    refetch()
  }

  const handleSaveBudget = async () => {
    setBudgetError(null)
    const startD = new Date(tempBudget.startDate)
    const endD = new Date(tempBudget.endDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (tempBudget.amount <= 0) {
      setBudgetError(t('Please enter a valid budget amount'))
      return
    }

    if (startD > endD) {
      setBudgetError(t('Start date cannot be after end date'))
      return
    }

    if (endD < today && !showExpiryConfirm) {
      setShowExpiryConfirm(true)
      return
    }

    setBudgetSaving(true)
    try {
      await setBudget({
        amount: tempBudget.amount,
        startDate: tempBudget.startDate,
        endDate: tempBudget.endDate,
        warningThreshold: tempBudget.warningThreshold,
      })
      setIsBudgetModalOpen(false)
      refetch()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : t('Failed to save budget'))
    } finally {
      setBudgetSaving(false)
      setShowExpiryConfirm(false)
    }
  }

  const handleRemoveBudget = async (id: string) => {
    try {
      await removeBudget(id)
      refetch()
    } catch (e) {
      // In a real app we might use a toast here. For now we just log it or could add another state
      console.error(e)
    }
  }

  const getPeriodLabel = () => {
    if (filterMode === 'custom') {
      if (customRange.start === customRange.end) {
        return `${t('Viewing')}: ${new Date(customRange.start).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        })}`
      }

      return `${new Date(customRange.start).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      })} – ${new Date(customRange.end).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      })}`
    }

    if (selectedPeriod === 'Month' && selectedMonth) {
      return new Date(`${selectedMonth}-01`).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      })
    }

    return selectedPeriod === 'All' ? t('Total') : t(selectedPeriod)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  const stats: DashboardStats = data?.stats ?? {
    totalSpent: 0,
    totalIncome: 0,
    pendingIncome: 0,
    expectedIncome: 0,
    netBalance: 0,
    count: 0,
    dailyAvg: 0,
    highest: 0,
    topCategory: null,
  }

  const dailySpending = data?.dailySpending ?? []
  const categoryData = data?.categoryData ?? []
  const transactions = data?.transactions ?? []
  const budget = data?.activeBudget ?? null
  const budgetStats = data?.budgetStats ?? null

  const nowOnlyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const budgetEndDate = budget?.endDate ? new Date(budget.endDate) : null
  const isExpired = budgetEndDate !== null && budgetEndDate < nowOnlyDate

  const budgetStatus = isExpired
    ? 'expired'
    : budgetStats?.isOver
      ? 'over'
      : budgetStats?.isWarning
        ? 'warning'
        : 'normal'

  const progressWidth = budgetStats
    ? `${Math.min(Math.max(budgetStats.percentage, 0), 100)}%`
    : '0%'

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />

      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

      <main
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`flex-1 ${isArabic ? 'lg:mr-64' : 'lg:ml-64'} h-screen overflow-y-auto p-4 sm:p-6 lg:p-8`}
      >
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500 font-medium bg-red-50 dark:bg-red-500/10 px-6 py-4 rounded-2xl border border-red-200 dark:border-red-500/20 shadow-sm">
              {error}
            </div>
          </div>
        ) : loading && !data ? (
          <LoadingScreen />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pt-16 lg:pt-0 pb-24"
          >
          {budget && isExpired && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50">
                  <AlertTriangle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {t('Overall budget has expired')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('The period for your active budget has ended. You can remove it or set a new one.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTempBudget({
                    amount: 1000,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(new Date().setDate(new Date().getDate() + 30))
                      .toISOString()
                      .split('T')[0],
                    warningThreshold: 70,
                  });
                  setBudgetError(null);
                  setShowExpiryConfirm(false);
                  setIsBudgetModalOpen(true);
                }}
                className="w-full sm:w-auto whitespace-nowrap rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                {t('Set New Budget')}
              </button>
            </motion.div>
          )}

          <motion.header
            variants={itemVariants}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="min-w-0">
              <h1 className="break-words text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white">
                {getGreeting(t)}, {user?.name?.split(' ')[0] || t('Guest')} 👋
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(locale, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <button
              onClick={() => {
                if (budget) {
                  setTempBudget({
                    amount: budget.amount,
                    startDate: budget.startDate.split('T')[0],
                    endDate: budget.endDate.split('T')[0],
                    warningThreshold: budget.warningThreshold ?? 70,
                  })
                } else {
                    setTempBudget({
                      amount: 1000,
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date(new Date().setDate(new Date().getDate() + 30))
                        .toISOString()
                        .split('T')[0],
                      warningThreshold: 70,
                    })
                  }
                  setBudgetError(null)
                  setShowExpiryConfirm(false)
                  setIsBudgetModalOpen(true)
              }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Wallet className="h-4 w-4 text-emerald-600" />
              {budget ? t('Edit Budget') : t('Set Budget')}
            </button>
          </motion.header>

          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
              <div className="no-scrollbar flex w-full gap-2 overflow-x-auto rounded-full bg-slate-100 p-1 dark:bg-slate-800/80 lg:w-auto">
                {(['Today', 'Week', 'Month', 'All'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterMode('preset')
                      setSelectedPeriod(period)
                    }}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      filterMode === 'preset' && selectedPeriod === period
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t(period)}
                  </button>
                ))}
              </div>

              {selectedPeriod === 'Month' && (
                <motion.div
                  initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex w-full items-center gap-2 sm:w-auto"
                >
                  <input
                    type="month"
                    value={selectedMonth}
                    lang={i18n.language}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
                  />
                </motion.div>
              )}

              <div className="mx-2 hidden h-8 w-px bg-slate-200 dark:bg-slate-700 lg:block" />

              <button
                onClick={() => setFilterMode('custom')}
                className={`w-full sm:w-auto rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  filterMode === 'custom'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {t('Custom Range')}
              </button>

              {filterMode === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input
                    type="date"
                    value={customRange.start}
                    lang={i18n.language}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
                  />
                  <span className="hidden text-sm text-slate-400 sm:inline">{t('to')}</span>
                  <input
                    type="date"
                    value={customRange.end}
                    lang={i18n.language}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
                  />
                </motion.div>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {budget && budgetStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`relative overflow-hidden rounded-2xl border p-5 text-slate-900 shadow-lg sm:p-6 dark:text-white ${
                    budgetStatus === 'expired'
                      ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-80'
                      : budgetStatus === 'over'
                        ? 'border-red-200 ring-2 ring-red-500/30 dark:border-red-500/20 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800'
                        : budgetStatus === 'warning'
                          ? 'border-orange-300 ring-2 ring-orange-500/50 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/30'
                          : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute top-0 right-0 -mr-16 -mt-16 rounded-full p-32 blur-3xl ${
                      budgetStatus === 'expired'
                        ? 'bg-slate-300/20 dark:bg-slate-500/5'
                        : budgetStatus === 'over'
                          ? 'bg-red-200/40 dark:bg-red-500/10'
                          : budgetStatus === 'warning'
                            ? 'bg-orange-200/40 dark:bg-orange-500/10'
                            : 'bg-slate-200/40 dark:bg-white/5'
                    }`}
                  />

                  <div className="relative z-10">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2">
                          {t('Active Budget')}
                          <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 py-0.5 px-2 rounded-full border border-slate-200 dark:border-slate-700">
                             {budget.warningThreshold}% {t('Threshold')}
                          </span>
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                         {new Date(budget.startDate).toLocaleDateString(locale)} –{' '}
                          {new Date(budget.endDate).toLocaleDateString(locale)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                            budgetStatus === 'expired'
                              ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/50 dark:bg-slate-500/20 dark:text-slate-200'
                              : budgetStatus === 'over'
                                ? 'border-red-300 bg-red-100 text-red-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-200'
                                : budgetStatus === 'warning'
                                  ? 'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-500/50 dark:bg-orange-500/20 dark:text-orange-200'
                                  : 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-200'
                          }`}
                        >
                          {(budgetStatus === 'over' || budgetStatus === 'warning' || budgetStatus === 'expired') && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {budgetStatus === 'expired'
                            ? t('Expired')
                            : budgetStatus === 'over'
                              ? t('over')
                              : budgetStatus === 'warning'
                                ? t('warning')
                                : t('remaining')}
                        </div>

                        {budget.id && (
                          <button
                            onClick={() => handleRemoveBudget(budget.id!)}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-600 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20 dark:hover:text-red-400"
                            aria-label={t('Remove Budget')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mb-2 flex flex-wrap items-end gap-2">
                      <span className="text-2xl sm:text-3xl font-bold font-heading">
                        $
                        {budgetStats.spentInBudget.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="mb-1 text-slate-500 dark:text-slate-400">
                        / $
                        {budget.amount.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div
                      className={`mb-2 h-3 w-full overflow-hidden rounded-full ${
                        budgetStatus === 'expired'
                          ? 'bg-slate-200 dark:bg-slate-700 opacity-50'
                          : budgetStatus === 'over'
                            ? 'bg-red-100 dark:bg-red-950/40'
                            : budgetStatus === 'warning'
                              ? 'bg-orange-100 dark:bg-orange-950/40'
                              : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          budgetStatus === 'expired'
                            ? 'bg-slate-400'
                            : budgetStatus === 'over'
                              ? 'bg-red-500'
                              : budgetStatus === 'warning'
                                ? 'bg-orange-500'
                                : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div
                      className={`flex flex-col gap-1 text-xs sm:flex-row sm:justify-between ${
                        budgetStatus === 'expired'
                          ? 'text-slate-500 dark:text-slate-400'
                          : budgetStatus === 'over'
                            ? 'text-red-600 dark:text-red-300'
                            : budgetStatus === 'warning'
                              ? 'text-orange-600 dark:text-orange-300'
                              : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className='font-bold text-lg'>
                        {budgetStats.percentage.toLocaleString(locale, {
                          maximumFractionDigits: 1,
                        })}
                        % {t('Spent')}
                      </span>
                      <span className='font-bold text-lg'>
                        {budgetStatus === 'expired'
                          ? t('Period ended')
                          : budgetStats.isOver
                            ? `$${Math.abs(budgetStats.remaining).toLocaleString(locale)} ${t('over')}`
                            : `$${budgetStats.remaining.toLocaleString(locale)} ${t('remaining')}`}
                      </span>
                    </div>

                    {budgetStats.isWarning && !budgetStats.isOver && !isExpired && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 p-2 text-[10px] text-orange-700 dark:text-orange-400 sm:text-xs"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {t('Warning: You have reached')} {budget.warningThreshold}%{' '}
                          {t('of your budget')}
                        </span>
                      </motion.div>
                    )}

                    {isExpired && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {t('Budget period has ended. New expenses are not tracked for this limit.')}
                        </span>
                      </motion.div>
                    )}

                    {budgetStats.isOver && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-[10px] text-red-700 dark:text-red-400 sm:text-xs"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {t('You have exceeded your budget by')} $
                          {Math.abs(budgetStats.remaining).toLocaleString(locale)}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <motion.div variants={itemVariants} className="group relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 opacity-75 blur-[1px] transition duration-200 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700/50 dark:bg-slate-800/80 dark:backdrop-blur-xl">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('Net Balance')}: {getPeriodLabel()} {(data as any)?.version && <span className="text-[10px] opacity-30 ml-2">({(data as any).version})</span>}
                  </p>
                  <h2 className={`mt-4 break-words text-4xl sm:text-5xl font-bold font-heading ${stats.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${stats.netBalance >= 0 ? stats.netBalance.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) : Math.abs(stats.netBalance).toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>
                </div>

                <div className="mt-6 flex flex-col gap-3 relative z-10 w-full sm:w-2/3">
                  <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t('Income')}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +${stats.totalIncome.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {stats.pendingIncome > 0 && (
                      <div className="flex items-center justify-between opacity-70">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{t('Pending')}</span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          +${stats.pendingIncome.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {stats.expectedIncome > 0 && (
                      <div className="flex items-center justify-between opacity-70">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{t('Expected')}</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          +${stats.expectedIncome.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{t('Expenses')}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      -${stats.totalSpent.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {stats.count.toLocaleString(locale)} {t('Transactions')}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8 dark:border-slate-700/50 dark:bg-slate-800/80 dark:backdrop-blur-xl"
            >
              <h3 className="mb-6 text-lg font-bold font-heading text-slate-900 dark:text-white">
                {t('Overview of your finances')}
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {t('Avg. Transaction')}
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    $
                    {stats.dailyAvg.toLocaleString(locale, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700" />

                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {t('Highest Expense')}
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    $
                    {stats.highest.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700" />

                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {t('Top Category')}
                  </span>
                  <span className="max-w-[10rem] truncate text-xl font-bold text-emerald-600 sm:max-w-none">
                    {stats.topCategory ? t(stats.topCategory) : t('None')}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6 dark:border-slate-700/50 dark:bg-slate-800/80 dark:backdrop-blur-xl lg:col-span-2"
            >
              <h3 className="mb-6 text-lg font-bold font-heading text-slate-900 dark:text-white">
                {t('Spending Over Time')}
              </h3>

              <div className="h-[260px] min-w-0 w-full sm:h-[300px]" style={{ minWidth: 0 }}>
                {dailySpending.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySpending}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E2E8F0"
                        className="opacity-50 dark:opacity-20"
                      />

                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                        dy={10}
                        interval="preserveStartEnd"
                        tickFormatter={(str) => {
                          const date = new Date(str)
                          return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                        tickFormatter={(v) => `$${v}`}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#059669', fontWeight: 600 }}
                        formatter={(v) => [`$${v ?? 0}`, t('Spent')]}
                        labelFormatter={(label) => {
                          return new Date(label).toLocaleDateString(locale, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#059669"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    {t('No expenses found for this period.')}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6 dark:border-slate-700/50 dark:bg-slate-800/80 dark:backdrop-blur-xl"
            >
              <h3 className="mb-2 text-lg font-bold font-heading text-slate-900 dark:text-white">
                {t('Category Breakdown')}
              </h3>

              <div className="relative h-[240px] min-w-0 w-full sm:h-[250px]" style={{ minWidth: 0 }}>
                {categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="block text-2xl font-bold font-heading text-slate-900 dark:text-white">
                          $
                          {stats.totalSpent.toLocaleString(locale, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t('Total')}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    {t('No expenses found for this period.')}
                  </div>
                )}
              </div>

              {categoryData.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {categoryData.slice(0, 6).map((item) => (
                    <div key={item.name} className="flex min-w-0 items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {t(item.name)}
                      </span>
                      <span className="ml-auto shrink-0 text-slate-400 dark:text-slate-500">
                        {stats.totalSpent > 0
                          ? Math.round((item.value / stats.totalSpent) * 100).toLocaleString(locale)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {t('Recent Expenses')}
              </h3>

              <Link
                to="/transactions"
                className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {t('View All')}
              </Link>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: isArabic ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:gap-0 ${
                    index % 2 === 0
                      ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700/30 dark:bg-slate-800/80 dark:hover:bg-slate-700/50'
                      : 'border-slate-200/70 bg-slate-50/70 hover:bg-slate-100/70 dark:border-slate-700/30 dark:bg-slate-800/40 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex min-w-0 items-center">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110"
                      style={{ 
                        backgroundColor: `${tx.color}20`, // 20% opacity for light bg
                        border: `1.5px solid ${tx.color}40`
                      }}
                    >
                      {tx.emoji}
                    </div>

                    <div className={`min-w-0 flex-1 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                      <h4 className="truncate font-bold font-heading text-slate-900 dark:text-white">
                        {tx.title}
                      </h4>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString(locale)} • {t(tx.category)}
                      </p>
                    </div>
                  </div>

                  <div className={`font-bold font-heading text-slate-900 dark:text-white sm:text-right ${isArabic ? 'sm:mr-4' : 'sm:ml-4'}`}>
                    -${tx.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                  </div>
                </motion.div>
              ))}

              {transactions.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t('No expenses found for this period.')}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
       )}
      </main>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-500 sm:bottom-8 sm:h-16 sm:w-16 ${
          isArabic ? 'left-4 sm:left-8' : 'right-4 sm:right-8'
        }`}
        aria-label={t('Add Expense')}
      >
        <Plus className="h-7 w-7 sm:h-8 sm:w-8" />
      </motion.button>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleExpenseAdded}
      />

      <AnimatePresence>
        {isBudgetModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBudgetModalOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
            >
              <div
                dir={isArabic ? 'rtl' : 'ltr'}
                className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/50 dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                      {budget ? t('Edit Budget') : t('Set Budget')}
                    </h2>

                    <button
                      onClick={() => setIsBudgetModalOpen(false)}
                      className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      aria-label={t('Close')}
                    >
                      <X className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                        {t('Budget Amount')}
                      </label>

                      <div className="relative">
                        <span
                          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                            isArabic ? 'right-4' : 'left-4'
                          }`}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={tempBudget.amount}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              amount: Number(e.target.value),
                            }))
                          }
                          className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white ${
                            isArabic ? 'pr-8 pl-4' : 'pl-8 pr-4'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                          {t('Start Date')}
                        </label>
                        <input
                          type="date"
                          value={tempBudget.startDate}
                          lang={i18n.language}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                          {t('End Date')}
                        </label>
                        <input
                          type="date"
                          value={tempBudget.endDate}
                          lang={i18n.language}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                          {t('Warning Threshold')}
                        </label>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {tempBudget.warningThreshold}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={tempBudget.warningThreshold}
                        onChange={(e) =>
                          setTempBudget((prev) => ({
                            ...prev,
                            warningThreshold: Number(e.target.value),
                          }))
                        }
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-emerald-600 dark:bg-slate-700"
                      />

                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {t('Alert color changes to orange when you reach this limit')}
                      </p>
                    </div>

                    <AnimatePresence>
                      {budgetError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            {budgetError}
                          </p>
                        </motion.div>
                      )}

                      {showExpiryConfirm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">
                              {t('Date Warning')}
                            </p>
                            <p className="text-[10px] text-orange-600 dark:text-orange-300">
                              {t('The end date has already passed. This budget will be marked as expired. Continue?')}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleSaveBudget}
                      disabled={budgetSaving}
                      className={`mt-4 w-full rounded-xl py-3 font-semibold text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        showExpiryConfirm 
                          ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-orange-900/20' 
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-emerald-900/20'
                      }`}
                    >
                      {budgetSaving 
                        ? t('Saving...') 
                        : showExpiryConfirm 
                          ? t('Confirm & Save') 
                          : t('Save Budget')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Home