import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Check, AlertCircle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CategoryBudgetCardProps {
  category: string
  emoji: string
  color: string
  spent: number
  budget: number | null
  warningThreshold: number
  startDate: string | null
  endDate: string | null
  onUpdateBudget: (
    categoryName: string,
    amount: number | null,
    startDate: string,
    endDate: string,
    warningThreshold: number
  ) => Promise<void>
  onRemoveBudget: (categoryName: string) => Promise<void>
}

export function CategoryBudgetCard({
  category,
  emoji,
  color,
  spent,
  budget,
  warningThreshold,
  startDate,
  endDate,
  onUpdateBudget,
  onRemoveBudget,
}: CategoryBudgetCardProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const locale = isArabic ? 'ar-EG' : 'en-US'

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(budget ? budget.toString() : '')
  const [editWarningThreshold, setEditWarningThreshold] = useState(warningThreshold)
  const [error, setError] = useState<string | null>(null)
  const [showExpiryConfirm, setShowExpiryConfirm] = useState(false)
  
  const now = new Date()
  const defaultStart = new Date().toISOString().split('T')[0]
  const defaultEnd = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  
  const [editStartDate, setEditStartDate] = useState(startDate ? startDate.split('T')[0] : defaultStart)
  const [editEndDate, setEditEndDate] = useState(endDate ? endDate.split('T')[0] : defaultEnd)

  useEffect(() => {
    setEditValue(budget ? budget.toString() : '')
    setEditWarningThreshold(warningThreshold)
    if (startDate) setEditStartDate(startDate.split('T')[0])
    if (endDate) setEditEndDate(endDate.split('T')[0])
  }, [budget, warningThreshold, startDate, endDate])

  const nowOnlyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const budgetEndDate = endDate ? new Date(endDate) : null
  const isExpired = budgetEndDate !== null && budgetEndDate < nowOnlyDate

  const handleSave = async () => {
    setError(null)
    const numValue = parseFloat(editValue)
    const startD = new Date(editStartDate)
    const endD = new Date(editEndDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (isNaN(numValue) || numValue <= 0) {
      setError(t('Please enter a valid budget amount'))
      return
    }

    if (startD > endD) {
      setError(t('Start date cannot be after end date'))
      return
    }

    if (endD < today && !showExpiryConfirm) {
      setShowExpiryConfirm(true)
      return
    }

    await onUpdateBudget(
      category,
      numValue,
      startD.toISOString(),
      endD.toISOString(),
      editWarningThreshold
    )
    setIsEditing(false)
    setShowExpiryConfirm(false)
  }

  const handleRemove = async () => {
    await onRemoveBudget(category)
    setEditValue('')
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(budget ? budget.toString() : '')
    setEditWarningThreshold(warningThreshold)
    setEditStartDate(startDate ? startDate.split('T')[0] : defaultStart)
    setEditEndDate(endDate ? endDate.split('T')[0] : defaultEnd)
    setError(null)
    setShowExpiryConfirm(false)
    setIsEditing(false)
  }

  const isOverBudget = budget !== null && spent > budget
  const percentage = budget ? Math.min((spent / budget) * 100, 100) : 0
  const isWarning = budget !== null && percentage >= warningThreshold && !isOverBudget
  const isValidAmount = !isNaN(parseFloat(editValue)) && parseFloat(editValue) > 0

  return (
    <motion.div
      layout
      className={`relative p-5 rounded-2xl border transition-all duration-300 ${
        isExpired
          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-75'
          : isOverBudget
            ? 'bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/30 shadow-lg shadow-red-100/20'
            : isWarning
              ? 'bg-orange-50/50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/30 shadow-lg shadow-orange-100/20'
              : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
            style={{
              backgroundColor: `${color}20`,
            }}
          >
            {emoji}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold font-heading text-slate-900 dark:text-white truncate">
              {t(category)}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {budget ? (isExpired ? t('Expired') : t('Limit set')) : t('No limit set')}
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors shrink-0"
            aria-label={`${t('Edit')} ${t(category)} ${t('budget')}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t('Budget Limit')}
              </label>
              <div className="relative">
                <span
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isArabic ? 'right-3' : 'left-3'
                  }`}
                >
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="0.00"
                  className={`w-full py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white ${
                    isArabic ? 'pr-7 pl-3' : 'pl-7 pr-3'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t('Start')}
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t('End')}
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t('Warning Threshold')}
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {editWarningThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={editWarningThreshold}
                onChange={(e) => setEditWarningThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                    {error}
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
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400">
                      {t('Date Warning')}
                    </p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-300">
                      {t('The end date has already passed. This budget will be marked as expired. Continue?')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => void handleSave()}
              disabled={!isValidAmount}
              className={`flex-1 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                showExpiryConfirm
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              }`}
            >
              {showExpiryConfirm ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {showExpiryConfirm ? t('Confirm & Save') : t('Save')}
            </button>

            <button
              onClick={handleCancel}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('Cancel')}
            </button>
          </div>

          {budget !== null && (
            <button
              onClick={() => void handleRemove()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('Remove Budget')}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex justify-between items-end mb-2 gap-3">
            <span className="text-2xl font-bold font-heading text-slate-900 dark:text-white break-words">
              $
              {spent.toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>

            {budget && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  / ${budget.toLocaleString(locale)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(startDate!).toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - {new Date(endDate!).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {budget ? (
            <>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    isOverBudget
                      ? 'bg-red-500'
                      : isWarning
                        ? 'bg-orange-500'
                        : ''
                  }`}
                  style={{
                    backgroundColor: isOverBudget || isWarning ? undefined : color,
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-medium gap-2">
                <span
                  className={
                    isOverBudget
                      ? 'text-red-600 dark:text-red-400 flex items-center gap-1'
                      : isWarning
                        ? 'text-orange-600 dark:text-orange-400 flex items-center gap-1'
                        : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {(isOverBudget || isWarning) && <AlertCircle className="w-3 h-3" />}
                  {percentage.toFixed(1)}% {t('used')}
                </span>

                <span
                  className={
                    isOverBudget
                      ? 'text-red-600 dark:text-red-400 text-right'
                      : isWarning
                        ? 'text-orange-600 dark:text-orange-400 text-right'
                        : 'text-slate-500 dark:text-slate-400 text-right'
                  }
                >
                  {isOverBudget
                    ? `$${(spent - budget).toLocaleString(locale, {
                        minimumFractionDigits: 2,
                      })} ${t('over')}`
                    : `$${(budget - spent).toLocaleString(locale, {
                        minimumFractionDigits: 2,
                      })} ${t('left')}`}
                </span>
              </div>

              {isWarning && !isOverBudget && !isExpired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2 text-orange-600 dark:text-orange-400 text-[10px]"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {t('Warning: Limit reached')} ({warningThreshold}%)
                </motion.div>
              )}

              {isExpired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('Budget period has ended. New expenses are not tracked for this limit.')}
                </motion.div>
              )}
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium"
            >
              + {t('Set Budget Limit')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}