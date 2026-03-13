import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Check, X, AlertCircle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CategoryBudgetCardProps {
  category: string
  emoji: string
  color: string
  spent: number
  budget: number | null
  warningThreshold: number
  onUpdateBudget: (categoryName: string, amount: number | null) => Promise<void>
  onRemoveBudget: (categoryName: string) => Promise<void>
}

export function CategoryBudgetCard({
  category,
  emoji,
  color,
  spent,
  budget,
  warningThreshold,
  onUpdateBudget,
  onRemoveBudget,
}: CategoryBudgetCardProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const locale = isArabic ? 'ar-EG' : 'en-US'

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(budget ? budget.toString() : '')

  useEffect(() => {
    setEditValue(budget ? budget.toString() : '')
  }, [budget])

  const handleSave = async () => {
    const numValue = parseFloat(editValue)

    if (!isNaN(numValue) && numValue > 0) {
      await onUpdateBudget(category, numValue)
      setIsEditing(false)
    }
  }

  const handleRemove = async () => {
    await onRemoveBudget(category)
    setEditValue('')
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(budget ? budget.toString() : '')
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
        isOverBudget
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
              {budget ? t('Limit set') : t('No limit set')}
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
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('Set Monthly Limit')}
          </label>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidAmount) void handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
            </div>

            <button
              onClick={() => void handleSave()}
              disabled={!isValidAmount}
              className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('Save')}
            >
              <Check className="w-5 h-5" />
            </button>

            <button
              onClick={handleCancel}
              className="p-2 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              aria-label={t('Cancel')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {budget !== null && (
            <button
              onClick={() => void handleRemove()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
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
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 shrink-0">
                / ${budget.toLocaleString(locale)}
              </span>
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

              {isWarning && !isOverBudget && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2 text-orange-600 dark:text-orange-400 text-[10px]"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {t('Warning: Limit reached')} ({warningThreshold}%)
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