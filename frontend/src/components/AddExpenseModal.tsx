import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Edit2, Palette, Smile, Trash2 } from 'lucide-react'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { useTranslation } from 'react-i18next'
import { createExpense } from '../api/expenses'
import { getStoredUser } from '../api/auth'
import { fetchCategories, updateCategory, deleteCategory } from '../api/categories'
import type { Category } from '../api/categories'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRESET_COLORS = [
  '#10B981',
  '#3B82F6',
  '#F43F5E',
  '#F59E0B',
  '#6366F1',
  '#64748B',
  '#EC4899',
  '#8B5CF6',
  '#22C55E',
  '#0EA5E9',
  '#E11D48',
  '#A855F7',
  '#14B8A6',
  '#F97316',
  '#84CC16',
  '#06B6D4',
  '#D946EF',
  '#000000',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#65A30D',
  '#0891B2',
  '#4F46E5',
]

export function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: AddExpenseModalProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [customCategory, setCustomCategory] = useState('')
  const [customIcon, setCustomIcon] = useState('📦')
  const [customColor, setCustomColor] = useState(PRESET_COLORS[0])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      const res = await fetchCategories('expense')
      setCategories(res.categories)
      if (res.categories.length > 0 && !categoryId) {
        setCategoryId(res.categories[0].id)
      }
    } catch (err) {
      setCategories([])
    }
  }

  useEffect(() => {
    if (categories.length > 0 && categoryId) {
      const user = getStoredUser()
      const isAdmin = (user?.role || '').toLowerCase() === 'admin'
      
      const selectedCat = categories.find((cat) => cat.id === categoryId)
      if (isAdmin && selectedCat?.name === 'Transport' && !title) {
        setTitle('Mashro3')
      }
    }
  }, [categoryId, categories, t])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (editingCategoryId) {
      setEditIcon(emojiData.emoji)
    } else {
      setCustomIcon(emojiData.emoji)
    }
    setShowEmojiPicker(false)
  }

  const startEditing = (cat: Category) => {
    setEditingCategoryId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon)
    setEditColor(cat.color)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !editName.trim()) return
    setLoading(true)
    try {
      await updateCategory(editingCategoryId, 'expense', {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
      })
      await loadCategories()
      setEditingCategoryId(null)
    } catch (err) {
      setError(t('Failed to update category'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!editingCategoryId || !window.confirm(t('Are you sure you want to delete this category?'))) return
    setLoading(true)
    try {
      await deleteCategory(editingCategoryId, 'expense')
      await loadCategories()
      setEditingCategoryId(null)
      setCategoryId(categories[0]?.id || '')
    } catch (err) {
      setError(t('Failed to delete category'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingCategoryId) {
      await handleUpdateCategory()
      return
    }

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError(t('Please enter a valid amount'))
      return
    }

    if (!categoryId) {
      setError(t('Please select a category'))
      return
    }

    if (categoryId === 'other' && !customCategory.trim()) {
      setError(t('Please enter a category name'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createExpense({
        amount: amt,
        title: title.trim() || t('Untitled'),
        note: note.trim() || undefined,
        date,
        categoryId,
        categoryName: categoryId === 'other' ? customCategory.trim() : undefined,
        categoryIcon: categoryId === 'other' ? customIcon : undefined,
        categoryColor: categoryId === 'other' ? customColor : undefined,
      })

      onSuccess?.()
      onClose()

      setAmount('')
      setTitle('')
      setNote('')
      setCustomCategory('')
      setCustomIcon('📦')
      setCustomColor(PRESET_COLORS[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to save expense'))
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
            <div
              dir={isArabic ? 'rtl' : 'ltr'}
              className="bg-white dark:bg-slate-800 dark:border dark:border-slate-700/50 w-full max-w-lg rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              <div
                className="w-full flex justify-center pt-4 pb-2"
                onClick={onClose}
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full cursor-pointer" />
              </div>

              <div className="p-8 pt-2 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                    {editingCategoryId ? t('Edit Category') : t('Add Expense')}
                  </h2>

                  <button
                    onClick={() => (editingCategoryId ? setEditingCategoryId(null) : onClose())}
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

                  {!editingCategoryId ? (
                    <>
                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          {t('Amount')}
                        </label>

                        <div className="relative">
                          <span
                            className={`absolute top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 ${
                              isArabic ? 'right-0' : 'left-0'
                            }`}
                          >
                            $
                          </span>

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`w-full py-2 text-4xl font-bold font-heading text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-600 border-b-2 border-slate-100 dark:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors bg-transparent ${
                              isArabic ? 'pr-6 text-right' : 'pl-6 text-left'
                            }`}
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">
                            {t('Title')}
                          </label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:text-white border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 ${
                              isArabic ? 'text-right' : 'text-left'
                            }`}
                            placeholder={t('What was it?')}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">
                            {t('Date')}
                          </label>
                          <input
                            type="date"
                            value={date}
                            lang={i18n.language}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-600 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">
                          {t('Note (Optional)')}
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:text-white border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all resize-none text-slate-900 ${
                            isArabic ? 'text-right' : 'text-left'
                          }`}
                          placeholder={t('Add more details...')}
                          rows={2}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">
                          {t('Category Name')}
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:text-white border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all ${
                            isArabic ? 'text-right' : 'text-left'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-600">
                        {editingCategoryId ? t('Customization') : t('Category')}
                      </label>
                    </div>

                    {!editingCategoryId ? (
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {categories.map((cat) => (
                          <div key={cat.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => setCategoryId(cat.id)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                                categoryId === cat.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                              }`}
                              style={
                                categoryId === cat.id
                                  ? { backgroundColor: cat.color, borderColor: cat.color }
                                  : {}
                              }
                            >
                              <span>{cat.icon || '📦'}</span>
                              <span className="font-medium text-sm">{t(cat.name)}</span>
                              {categoryId === cat.id && (
                                <Check className={`w-3 h-3 ${isArabic ? 'mr-1' : 'ml-1'}`} />
                              )}
                            </button>

                            {categoryId === cat.id && cat.isCustom && (
                              <button
                                type="button"
                                onClick={() => startEditing(cat)}
                                className={`absolute -top-2 p-1.5 bg-white dark:bg-slate-700 rounded-full shadow-md border border-slate-100 dark:border-slate-600 text-slate-400 dark:text-slate-200 hover:text-emerald-500 transition-all ${
                                  isArabic ? '-left-2' : '-right-2'
                                }`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setCategoryId('other')}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                            categoryId === 'other'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                          }`}
                        >
                          <span>➕</span>
                          <span className="font-medium text-sm">{t('Add Other...')}</span>
                          {categoryId === 'other' && (
                            <Check className={`w-3 h-3 ${isArabic ? 'mr-1' : 'ml-1'}`} />
                          )}
                        </button>
                      </div>
                    ) : null}

                    {(categoryId === 'other' || editingCategoryId) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50"
                      >
                        {categoryId === 'other' && !editingCategoryId && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              {t('New Category Name')}
                            </label>
                            <input
                              type="text"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white ${
                                isArabic ? 'text-right' : 'text-left'
                              }`}
                              placeholder={t('e.g., Subscription, Gym, Gift')}
                              autoFocus
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              {editingCategoryId ? <Smile className="w-3 h-3" /> : null}
                              {t('Icon')}
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-3xl hover:bg-white hover:border-emerald-500 transition-all"
                            >
                              {editingCategoryId ? editIcon : customIcon}
                            </button>
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              {editingCategoryId ? <Palette className="w-3 h-3" /> : null}
                              {t('Color')}
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                              {PRESET_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => (editingCategoryId ? setEditColor(c) : setCustomColor(c))}
                                  className="w-full aspect-square rounded-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                                  style={{ backgroundColor: c }}
                                >
                                  {(editingCategoryId ? editColor : customColor) === c && (
                                    <Check className="w-4 h-4 text-white" />
                                  )}
                                </button>
                              ))}
                            </div>
                            {(() => {
                              const currentColor = editingCategoryId ? editColor : customColor;
                              const isTaken = categories.some(cat => cat.color === currentColor && cat.id !== editingCategoryId);
                              if (isTaken) {
                                return (
                                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    {t('This color is already used, but you can reuse it')}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {showEmojiPicker && (
                          <div className="relative z-[60] mt-4">
                            <div className={`absolute top-0 ${isArabic ? 'right-0' : 'left-0'}`}>
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-heading font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-4 disabled:opacity-50"
                  >
                    {loading
                      ? t('Processing...')
                      : editingCategoryId
                      ? t('Save Changes')
                      : t('Save Expense')}
                  </button>

                  {editingCategoryId && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleDeleteCategory}
                        className="w-full py-3 flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('Delete Category')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                      >
                        {t('Cancel Editing')}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}