import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Sidebar } from '../../components/Sidebar'
import { useTranslation } from 'react-i18next'
import {
  fetchExpenses,
  updateExpense,
  deleteExpense,
} from '../../api/expenses'
import { fetchCategories } from '../../api/categories'
import type { Expense } from '../../api/expenses'
import type { Category } from '../../api/categories'

type TimePeriod = 'Today' | 'Week' | 'Month' | 'All'
type FilterMode = 'preset' | 'custom'

const PERIOD_MAP: Record<TimePeriod, string> = {
  Today: 'today',
  Week: 'week',
  Month: 'month',
  All: 'all',
}



export function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterMode, setFilterMode] = useState<FilterMode>('preset')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('All')
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [searchDebounced, setSearchDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  const fetchParams = useMemo(() => {
    if (filterMode === 'custom') {
      return {
        period: 'custom' as const,
        startDate: customRange.start,
        endDate: customRange.end,
        search: searchDebounced || undefined,
        limit: 500,
      }
    }
    return {
      period: PERIOD_MAP[selectedPeriod],
      search: searchDebounced || undefined,
      limit: 500,
    }
  }, [filterMode, selectedPeriod, customRange, searchDebounced])

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchExpenses(fetchParams)
      setExpenses(res.expenses)
      setTotal(res.total)
    } catch {
      setExpenses([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchParams])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    fetchCategories()
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]))
  }, [])

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => {
      if (c.color) map[c.name] = c.color
    })
    return map
  }, [categories])

  const categoryFilterOptions = useMemo(() => {
    const names = new Set(expenses.map((e) => e.category))
    return ['All', ...Array.from(names).sort()]
  }, [expenses])

  const filteredTransactions = useMemo(() => {
    if (selectedCategory === 'All') return expenses
    return expenses.filter((tx) => tx.category === selectedCategory)
  }, [expenses, selectedCategory])

  const stats = useMemo(() => {
    const totalSpent = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0)
    const count = filteredTransactions.length
    const avgTransaction = count > 0 ? totalSpent / count : 0
    const highest = Math.max(...filteredTransactions.map((t) => t.amount), 0)
    return { totalSpent, count, avgTransaction, highest }
  }, [filteredTransactions])

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id)
      setDeleteConfirm(null)
      loadExpenses()
    } catch (e) {
      alert(e instanceof Error ? e.message : t('Delete failed'))
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />

      {/* ✅ responsive spacing with sidebar */}
      <main className="flex-1 ml-0 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-6 pt-16 lg:pt-0"
        >
          <motion.header
            variants={itemVariants}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6 sm:mb-8"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white">
                {t('Transactions')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                {t('View and manage all your expenses')}
              </p>
            </div>
          </motion.header>

          {/* Date Filter */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 sm:items-center">
              {/* ✅ scrollable pills on mobile */}
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full overflow-x-auto scrollbar-hide w-full sm:w-auto">
                {(['Today', 'Week', 'Month', 'All'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterMode('preset')
                      setSelectedPeriod(period)
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      filterMode === 'preset' && selectedPeriod === period
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t(period)}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center">
                <button
                  onClick={() => setFilterMode('custom')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
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
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2"
                  >
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) =>
                        setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    />
                    <span className="text-slate-400 text-sm hidden sm:inline">{t('to')}</span>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) =>
                        setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Summary Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('Total Spent')}</p>
              <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                $
                {stats.totalSpent.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Avg. Transaction')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                $
                {stats.avgTransaction.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Highest Expense')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                $
                {stats.highest.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Total Count')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
                {stats.count.toLocaleString(locale)}
              </h3>
            </div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-4 rounded-2xl shadow-card flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between sticky top-0 z-10"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('Search expenses...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
              {categoryFilterOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Transactions List */}
          <motion.div variants={itemVariants} className="space-y-3 pb-12">
            {loading ? (
              <div className="text-center py-12 text-slate-500">{t('Loading...')}</div>
            ) : (
              <AnimatePresence>
                {filteredTransactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden"
                  >
                    <div
                      onClick={() =>
                        setExpandedId(expandedId === tx.id ? null : tx.id)
                      }
                      className="p-4 flex items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                        style={{
                          backgroundColor: categoryColorMap[tx.category]
                            ? `${categoryColorMap[tx.category]}33`
                            : undefined,
                          color: categoryColorMap[tx.category] || undefined,
                        }}
                      >
                        {tx.emoji}
                      </div>

                      {/* ✅ mobile-friendly layout */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold font-heading text-slate-900 dark:text-white truncate">
                              {tx.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {t(tx.category)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 md:hidden">
                                <Calendar className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString(locale)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="font-bold font-heading text-base sm:text-lg text-slate-900 dark:text-white">
                              -${tx.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex flex-col text-sm text-slate-500 dark:text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString(locale)}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-400 pt-1 sm:pt-0">
                        {expandedId === tx.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === tx.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40"
                        >
                          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  {t('Note')}
                                </label>
                                <p className="text-slate-700 dark:text-slate-300 mt-1 break-words">
                                  {tx.note || '—'}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t('Transaction ID')}
                                  </label>
                                  <p className="text-slate-700 dark:text-slate-300 font-mono text-sm mt-1">
                                    #{String(tx.id).slice(-8)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t('Date')}
                                  </label>
                                  <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
                                    {new Date(tx.date).toLocaleDateString(locale)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col justify-end items-stretch md:items-end">
                              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditModal(tx)
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
                                >
                                  <Edit2 className="w-4 h-4" /> {t('Edit')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirm(tx.id)
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
                                >
                                  <Trash2 className="w-4 h-4" /> {t('Delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!loading && filteredTransactions.length > 0 && (
              <p className="text-slate-500 text-sm mt-4">
                {t('Showing')} {filteredTransactions.length.toLocaleString(locale)}
                {selectedCategory !== 'All' ? ` ${t('of_total')} ${expenses.length.toLocaleString(locale)}` : ` ${t('of_total')} ${total.toLocaleString(locale)}`}{' '}
                {t('transactions')}
              </p>
            )}

            {!loading && filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('No transactions found')}
                </h3>
                <p className="text-slate-500">
                  {t('Try adjusting your filters or search terms')}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <EditExpenseModal
            expense={editModal}
            categories={categories}
            onClose={() => setEditModal(null)}
            onSuccess={() => {
              setEditModal(null)
              loadExpenses()
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full dark:border dark:border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Delete expense?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EditExpenseModalProps {
  expense: Expense
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

function EditExpenseModal({
  expense,
  categories,
  onClose,
  onSuccess,
}: EditExpenseModalProps) {
  const { t } = useTranslation()
  const resolvedCategoryId =
    expense.categoryId ??
    categories.find((c) => c.name === expense.category)?.id ??
    categories[0]?.id ??
    ''
  const [amount, setAmount] = useState(String(expense.amount))
  const [title, setTitle] = useState(expense.title)
  const [note, setNote] = useState(expense.note ?? '')
  const [date, setDate] = useState(expense.date)
  const [categoryId, setCategoryId] = useState(resolvedCategoryId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCategoryId(resolvedCategoryId)
  }, [resolvedCategoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    if (!categoryId) return
    setSaving(true)
    try {
      await updateExpense(expense.id, {
        amount: amt,
        title: title.trim() || 'Untitled',
        note: note.trim() || undefined,
        date,
        categoryId,
      })
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('Update failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full dark:border dark:border-slate-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('Edit Expense')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t('Amount')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t('Title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t('Note')}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t('Date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t('Category')}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? t('Saving...') : t('Save')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}

export default TransactionsPage