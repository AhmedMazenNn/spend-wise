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
import { Plus, X, Wallet, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import Sidebar from '../../components/Sidebar'
import { AddExpenseModal } from '../../components/AddExpenseModal'
import { useExpenseData, type TimePeriod } from '../../hooks/useExpenseData'
import { getStoredUser } from '../../api/auth'
import { setBudget, removeBudget } from '../../api/budgets'

type FilterMode = 'preset' | 'custom'

const getGreeting = (t: any) => {
  const h = new Date().getHours()
  if (h < 12) return t('Good morning')
  if (h < 17) return t('Good afternoon')
  return t('Good evening')
}

function Home() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const user = getStoredUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [filterMode, setFilterMode] = useState<FilterMode>('preset')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Month')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [tempBudget, setTempBudget] = useState({
    amount: 1000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString()
      .split('T')[0],
  })
  const [budgetSaving, setBudgetSaving] = useState(false)

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
    setBudgetSaving(true)
    try {
      await setBudget({
        amount: tempBudget.amount,
        startDate: tempBudget.startDate,
        endDate: tempBudget.endDate,
      })
      setIsBudgetModalOpen(false)
      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save budget')
    } finally {
      setBudgetSaving(false)
    }
  }

  const handleRemoveBudget = async (id: string) => {
    try {
      await removeBudget(id)
      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove budget')
    }
  }

  const getPeriodLabel = () => {
    if (filterMode === 'custom') {
      if (customRange.start === customRange.end) {
        return `Viewing: ${new Date(customRange.start).toLocaleDateString(locale, {
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
      return new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    }
    return selectedPeriod === 'All' ? 'Total' : selectedPeriod
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  const stats = data?.stats ?? {
    totalSpent: 0,
    count: 0,
    dailyAvg: 0,
    highest: 0,
    topCategory: null as string | null,
  }
  const dailySpending = data?.dailySpending ?? []
  const categoryData = data?.categoryData ?? []
  const transactions = data?.transactions ?? []
  const budget = data?.activeBudget ?? null
  const budgetStats = data?.budgetStats ?? null

  if (loading && !data) {
    return (
      <div className="flex min-h-screen bg-main">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-main">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pt-16 lg:pt-0"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white break-words">
                {getGreeting(t)}, {user?.name?.split(' ')[0] || t('Guest')} 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
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
                  })
                }
                setIsBudgetModalOpen(true)
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              {budget ? t('Set Budget') : t('Set Budget')}
            </button>
          </motion.header>

          {/* Date Filter */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:gap-2 lg:items-center">
              <div className="w-full lg:w-auto flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full overflow-x-auto no-scrollbar">
                {(['Today', 'Week', 'Month', 'All'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterMode('preset')
                      setSelectedPeriod(period)
                    }}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      filterMode === 'preset' && selectedPeriod === period
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t(period)}
                  </button>
                ))}
              </div>

              {selectedPeriod === 'Month' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                </motion.div>
              )}

              <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

              <button
                onClick={() => setFilterMode('custom')}
                className={`w-full sm:w-auto px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  filterMode === 'custom'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t('Custom Range')}
              </button>

              {filterMode === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-0"
                >
                  <input
                    type="date"
                    value={customRange.start}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                  <span className="text-slate-400 text-sm hidden sm:inline">to</span>
                  <input
                    type="date"
                    value={customRange.end}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Budget Card */}
          <AnimatePresence>
            {budget && budgetStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-heading">{t('Active Budget')}</h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {new Date(budget.startDate).toLocaleDateString()} –{' '}
                          {new Date(budget.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            budgetStats.isOver
                              ? 'bg-red-500/20 border-red-500/50 text-red-200'
                              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                          }`}
                        >
                          {budgetStats.isOver ? t('over') : t('remaining')}
                        </div>
                        {budget.id && (
                          <button
                            onClick={() => handleRemoveBudget(budget.id!)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                            aria-label="Remove Budget"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2 mb-2">
                      <span className="text-2xl sm:text-3xl font-bold font-heading">
                        $
                        {budgetStats.spentInBudget.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-slate-400 mb-1">
                        / ${budget.amount.toLocaleString(locale)}
                      </span>
                    </div>

                    <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetStats.percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          budgetStats.isOver ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-slate-400">
                      <span>{budgetStats.percentage.toLocaleString(locale, { maximumFractionDigits: 1 })}% {t('Spent')}</span>
                      <span>
                        {budgetStats.isOver
                          ? `$${Math.abs(budgetStats.remaining).toLocaleString(locale)} ${t('over')}`
                          : `$${budgetStats.remaining.toLocaleString(locale)} ${t('remaining')}`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-200 blur-[1px]" />
              <div className="relative h-full bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">
                    {t('Spent')}: {getPeriodLabel()}
                  </p>
                  <h2 className="text-4xl sm:text-5xl font-bold font-heading text-slate-900 dark:text-white mt-4 break-words">
                    $
                    {stats.totalSpent.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-500/30">
                    {stats.count.toLocaleString(locale)} {t('Transactions')}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-card flex flex-col justify-between"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-6">
                {t('Overview of your finances')}
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{t('Avg. Transaction')}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    $
                    {stats.dailyAvg.toLocaleString(locale, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{t('Highest Expense')}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    $
                    {stats.highest.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{t('Top Category')}</span>
                  <span className="text-xl font-bold text-emerald-600 truncate max-w-[10rem] sm:max-w-none">
                    {stats.topCategory ? t(stats.topCategory) : 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 rounded-2xl p-5 sm:p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-6">
                {t('Spending Over Time')}
              </h3>
              <div className="h-[260px] sm:h-[300px] w-full min-w-0" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySpending}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="opacity-50 dark:opacity-20" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      dy={10}
                      interval={6}
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
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 rounded-2xl p-5 sm:p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-2">
                {t('Category Breakdown')}
              </h3>
              <div className="h-[240px] sm:h-[250px] w-full relative min-w-0" style={{ minWidth: 0 }}>
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

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-2xl font-bold font-heading text-slate-900 dark:text-white">
                      $
                      {stats.totalSpent.toLocaleString(locale, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-xs text-slate-400">{t('Total')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryData.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                      {stats.totalSpent > 0
                        ? Math.round((item.value / stats.totalSpent) * 100).toLocaleString(locale)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Expenses */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {t('Recent Expenses')}
              </h3>
              <Link
                to="/transactions"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline shrink-0"
              >
                {t('View All')}
              </Link>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 p-4 rounded-xl ${
                    index % 2 === 0 ? 'bg-white dark:bg-slate-800/80' : 'bg-slate-50/50 dark:bg-slate-800/40'
                  } hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors dark:border dark:border-slate-700/30`}
                >
                  <div className="flex items-center min-w-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4 shrink-0 ${
                        tx.category === 'Food'
                          ? 'bg-orange-100 dark:bg-orange-900/40'
                          : tx.category === 'Transport'
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : tx.category === 'Shopping'
                              ? 'bg-pink-100 dark:bg-pink-900/40'
                              : tx.category === 'Bills'
                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                : tx.category === 'Health'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                  : tx.category === 'Fun'
                                    ? 'bg-amber-100 dark:bg-amber-900/40'
                                    : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                    >
                      {tx.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold font-heading text-slate-900 dark:text-white truncate">
                        {tx.title}
                      </h4>
                      <p className="text-sm text-slate-400 dark:text-slate-500 truncate">
                        {tx.date} • {t(tx.category)}
                      </p>
                    </div>
                  </div>

                  <div className="font-bold font-heading text-slate-900 dark:text-white sm:ml-4 sm:text-right">
                    -${tx.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                  </div>
                </motion.div>
              ))}

              {transactions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {t('No expenses found for this period.')}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center z-30 hover:bg-emerald-500 transition-colors"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
      </motion.button>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleExpenseAdded}
      />

      {/* Budget Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBudgetModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden mx-4 dark:border dark:border-slate-700/50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                      {t('Set Budget')}
                    </h2>
                    <button
                      onClick={() => setIsBudgetModalOpen(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        {t('Budget Amount')}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={tempBudget.amount}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              amount: Number(e.target.value),
                            }))
                          }
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {t('Start Date')}
                        </label>
                        <input
                          type="date"
                          value={tempBudget.startDate}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {t('End Date')}
                        </label>
                        <input
                          type="date"
                          value={tempBudget.endDate}
                          onChange={(e) =>
                            setTempBudget((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveBudget}
                      disabled={budgetSaving}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors mt-4 disabled:opacity-50"
                    >
                      {budgetSaving ? t('Saving...') : t('Save Budget')}
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