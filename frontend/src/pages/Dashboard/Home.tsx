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

import Sidebar from '../../components/Sidebar'
import { AddExpenseModal } from '../../components/AddExpenseModal'
import { useExpenseData, type TimePeriod } from '../../hooks/useExpenseData'
import { getStoredUser } from '../../api/auth'
import { setBudget, removeBudget } from '../../api/budgets'

type FilterMode = 'preset' | 'custom'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function Home() {
  const user = getStoredUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('preset')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Month')
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
        return `Viewing: ${new Date(customRange.start).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`
      }
      return `${new Date(customRange.start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${new Date(customRange.end).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`
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
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-main">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="flex justify-between items-end"
          >
            <div>
              <h1 className="text-3xl font-bold font-heading text-slate-900">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
              <p className="text-slate-500 mt-1">
                {new Date().toLocaleDateString('en-US', {
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
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              {budget ? 'Edit Budget' : 'Set Budget'}
            </button>
          </motion.header>

          {/* Date Filter */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
                {(['Today', 'Week', 'Month', 'All'] as TimePeriod[]).map(
                  (period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setFilterMode('preset')
                        setSelectedPeriod(period)
                      }}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterMode === 'preset' && selectedPeriod === period ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {period}
                    </button>
                  ),
                )}
              </div>
              <div className="w-px h-8 bg-slate-200 mx-2" />
              <button
                onClick={() => setFilterMode('custom')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${filterMode === 'custom' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Custom Range
              </button>
              {filterMode === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 ml-2"
                >
                  <input
                    type="date"
                    value={customRange.start}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                  />
                  <span className="text-slate-400 text-sm">to</span>
                  <input
                    type="date"
                    value={customRange.end}
                    onChange={(e) =>
                      setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
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
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-heading">
                          Active Budget
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {new Date(budget.startDate).toLocaleDateString()} –{' '}
                          {new Date(budget.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${budgetStats.isOver ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}
                        >
                          {budgetStats.isOver ? 'Over Budget' : 'On Track'}
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
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold font-heading">
                        $
                        {budgetStats.spentInBudget.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-slate-400 mb-1">
                        / ${budget.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetStats.percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${budgetStats.isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{budgetStats.percentage.toFixed(1)}% used</span>
                      <span>
                        {budgetStats.isOver
                          ? `$${Math.abs(budgetStats.remaining).toLocaleString()} over`
                          : `$${budgetStats.remaining.toLocaleString()} remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-200 blur-[1px]" />
              <div className="relative h-full bg-white rounded-2xl p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                    Spent: {getPeriodLabel()}
                  </p>
                  <h2 className="text-5xl font-bold font-heading text-slate-900 mt-4">
                    $
                    {stats.totalSpent.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                    {stats.count} Transactions
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl p-8 shadow-card flex flex-col justify-between"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">
                Quick Stats
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Daily Average</span>
                  <span className="text-xl font-bold text-slate-900">
                    $
                    {stats.dailyAvg.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    Highest Expense
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    $
                    {stats.highest.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Top Category</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {stats.topCategory || 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">
                Spending Over Time
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySpending}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
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
                      formatter={(v) => [`$${v ?? 0}`, 'Spent']}
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
              className="bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">
                Category Breakdown
              </h3>
              <div className="h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
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
                    <span className="block text-2xl font-bold font-heading text-slate-900">
                      $
                      {stats.totalSpent.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-xs text-slate-400">Total</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {categoryData.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 truncate">{item.name}</span>
                    <span className="text-slate-400 ml-auto">
                      {stats.totalSpent > 0
                        ? Math.round((item.value / stats.totalSpent) * 100)
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-heading text-slate-900">
                Recent Expenses
              </h3>
              <Link
                to="/transactions"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center p-4 rounded-xl ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4 ${tx.category === 'Food' ? 'bg-orange-100' : tx.category === 'Transport' ? 'bg-blue-100' : tx.category === 'Shopping' ? 'bg-pink-100' : tx.category === 'Bills' ? 'bg-purple-100' : tx.category === 'Health' ? 'bg-emerald-100' : tx.category === 'Fun' ? 'bg-amber-100' : 'bg-slate-100'}`}
                  >
                    {tx.emoji}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold font-heading text-slate-900">
                      {tx.title}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {tx.date} • {tx.category}
                    </p>
                  </div>
                  <div className="font-bold font-heading text-slate-900">
                    -${tx.amount.toFixed(2)}
                  </div>
                </motion.div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No expenses found for this period.
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
        className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center z-30 hover:bg-emerald-500 transition-colors"
      >
        <Plus className="w-8 h-8" />
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
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-heading text-slate-900">
                      Set Budget
                    </h2>
                    <button
                      onClick={() => setIsBudgetModalOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Budget Amount
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
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Start Date
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          End Date
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
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveBudget}
                      disabled={budgetSaving}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors mt-4 disabled:opacity-50"
                    >
                      {budgetSaving ? 'Saving...' : 'Save Budget'}
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
