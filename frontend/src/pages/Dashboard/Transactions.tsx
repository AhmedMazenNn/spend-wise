import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Sidebar } from '../../components/Sidebar'
import {
  fetchExpenses,
  updateExpense,
  deleteExpense,
  exportExpensesCsv,
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

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    Food: 'bg-orange-100',
    Transport: 'bg-blue-100',
    Shopping: 'bg-pink-100',
    Bills: 'bg-purple-100',
    Health: 'bg-emerald-100',
    Fun: 'bg-amber-100',
  }
  return map[category] ?? 'bg-slate-100'
}

export function TransactionsPage() {
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
  const [exporting, setExporting] = useState(false)
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
    fetchCategories().then((r) => setCategories(r.categories)).catch(() => setCategories([]))
  }, [])

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

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportExpensesCsv({
        period: filterMode === 'custom' ? 'custom' : PERIOD_MAP[selectedPeriod],
        startDate: filterMode === 'custom' ? customRange.start : undefined,
        endDate: filterMode === 'custom' ? customRange.end : undefined,
        search: searchTerm || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id)
      setDeleteConfirm(null)
      loadExpenses()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
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

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-6"
        >
          <motion.header
            variants={itemVariants}
            className="flex justify-between items-end mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold font-heading text-slate-900">
                Transactions
              </h1>
              <p className="text-slate-500 mt-1">
                View and manage all your expenses
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
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

          {/* Summary Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="bg-white p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Spent</p>
              <h3 className="text-2xl font-bold font-heading text-slate-900">
                $
                {stats.totalSpent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 text-sm font-medium mb-1">
                Avg. Transaction
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900">
                $
                {stats.avgTransaction.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 text-sm font-medium mb-1">
                Highest Expense
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900">
                $
                {stats.highest.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 text-sm font-medium mb-1">
                Total Count
              </p>
              <h3 className="text-2xl font-bold font-heading text-blue-600">
                {stats.count}
              </h3>
            </div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div
            variants={itemVariants}
            className="bg-white p-4 rounded-2xl shadow-card flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
              {categoryFilterOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Transactions List */}
          <motion.div variants={itemVariants} className="space-y-3 pb-12">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : (
              <AnimatePresence>
                {filteredTransactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                  >
                    <div
                      onClick={() =>
                        setExpandedId(expandedId === tx.id ? null : tx.id)
                      }
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${getCategoryBg(tx.category)}`}
                      >
                        {tx.emoji}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div>
                          <h4 className="font-bold font-heading text-slate-900 truncate">
                            {tx.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {tx.category}
                            </span>
                          </div>
                        </div>
                        <div className="hidden md:flex flex-col text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {tx.date}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-heading text-lg text-slate-900">
                            -${tx.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-400">
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
                          className="border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  Note
                                </label>
                                <p className="text-slate-700 mt-1">
                                  {tx.note || '—'}
                                </p>
                              </div>
                              <div className="flex gap-6">
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Transaction ID
                                  </label>
                                  <p className="text-slate-700 font-mono text-sm mt-1">
                                    #{String(tx.id).slice(-8)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Date
                                  </label>
                                  <p className="text-slate-700 text-sm mt-1">
                                    {tx.date}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between items-end">
                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditModal(tx)
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirm(tx.id)
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
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
                Showing {filteredTransactions.length}
                {selectedCategory !== 'All' ? ` of ${expenses.length}` : ` of ${total}`}{' '}
                transactions
              </p>
            )}

            {!loading && filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  No transactions found
                </h3>
                <p className="text-slate-500">
                  Try adjusting your filters or search terms
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
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Delete expense?
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
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
      alert(err instanceof Error ? err.message : 'Update failed')
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
          className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
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
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}

export default TransactionsPage
