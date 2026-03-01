import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { createExpense } from '../api/expenses'
import { fetchCategories } from '../api/categories'
import type { Category } from '../api/categories'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
        .then((res) => {
          setCategories(res.categories)
          if (res.categories.length > 0) {
            setCategoryId((prev) => prev || res.categories[0].id)
          }
        })
        .catch(() => setCategories([]))
    }
  }, [isOpen])

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!categoryId) {
      setError('Please select a category')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createExpense({
        amount: amt,
        title: description.trim() || 'Untitled',
        date,
        categoryId,
      })
      onSuccess?.()
      onClose()
      setAmount('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden">
              <div
                className="w-full flex justify-center pt-4 pb-2"
                onClick={onClose}
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer" />
              </div>

              <div className="p-8 pt-2">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-heading text-slate-900">
                    Add Expense
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-6 py-2 text-4xl font-bold font-heading text-slate-900 placeholder-slate-200 border-b-2 border-slate-100 focus:border-emerald-500 focus:outline-none transition-colors bg-transparent"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">
                        Description
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="What was it?"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">
                        Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-600">
                      Category
                    </label>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${categoryId === cat.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                        >
                          <span>{cat.icon || '📦'}</span>
                          <span className="font-medium text-sm">{cat.name}</span>
                          {categoryId === cat.id && (
                            <Check className="w-3 h-3 ml-1" />
                          )}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <span className="text-slate-400 text-sm">
                          Loading categories...
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-heading font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-4 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Expense'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
