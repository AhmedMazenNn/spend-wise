import { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Check, X, AlertCircle } from 'lucide-react'
interface CategoryBudgetCardProps {
  category: string
  emoji: string
  color: string
  spent: number
  budget: number | null
  onUpdateBudget: (category: string, amount: number | null) => void
}
export function CategoryBudgetCard({
  category,
  emoji,
  color,
  spent,
  budget,
  onUpdateBudget,
}: CategoryBudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(budget ? budget.toString() : '')
  const handleSave = () => {
    const numValue = parseFloat(editValue)
    if (!isNaN(numValue) && numValue > 0) {
      onUpdateBudget(category, numValue)
    } else if (editValue === '') {
      onUpdateBudget(category, null)
    }
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEditValue(budget ? budget.toString() : '')
    setIsEditing(false)
  }
  const isOverBudget = budget !== null && spent > budget
  const percentage = budget ? Math.min((spent / budget) * 100, 100) : 0
  return (
    <motion.div
      layout
      className={`bg-white rounded-2xl p-6 shadow-card border-2 transition-colors ${isOverBudget ? 'border-red-100' : 'border-transparent'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{
              backgroundColor: `${color}20`,
            }} // 20% opacity hex
          >
            {emoji}
          </div>
          <div>
            <h3 className="font-bold font-heading text-slate-900">
              {category}
            </h3>
            <p className="text-sm text-slate-500">
              {budget ? 'Budget set' : 'No budget set'}
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            aria-label={`Edit ${category} budget`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600">
            Set Monthly Limit
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
            </div>
            <button
              onClick={handleSave}
              className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold font-heading text-slate-900">
              $
              {spent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {budget && (
              <span className="text-sm font-medium text-slate-500 mb-1">
                / ${budget.toLocaleString()}
              </span>
            )}
          </div>

          {budget ? (
            <>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${percentage}%`,
                  }}
                  transition={{
                    duration: 1,
                    ease: 'easeOut',
                  }}
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : ''}`}
                  style={{
                    backgroundColor: isOverBudget ? undefined : color,
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span
                  className={
                    isOverBudget
                      ? 'text-red-600 flex items-center gap-1'
                      : 'text-slate-500'
                  }
                >
                  {isOverBudget && <AlertCircle className="w-3 h-3" />}
                  {percentage.toFixed(1)}% used
                </span>
                <span
                  className={isOverBudget ? 'text-red-600' : 'text-slate-500'}
                >
                  {isOverBudget
                    ? `$${(spent - budget).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })} over`
                    : `$${(budget - spent).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })} left`}
                </span>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 mt-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm font-medium"
            >
              + Set Budget Limit
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
