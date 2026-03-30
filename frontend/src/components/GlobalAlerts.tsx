import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchCategoryBudgets } from '../api/budgets'
import { fetchCategories } from '../api/categories'
import { Link, useLocation } from 'react-router-dom'

export function GlobalAlerts() {
  const { t } = useTranslation()
  const location = useLocation()
  const [expiredBudgets, setExpiredBudgets] = useState<{ id: string, name: string }[]>([])
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkBudgets = async () => {
      try {
        const [{ categories }, { budgets }] = await Promise.all([
          fetchCategories('expense'),
          fetchCategoryBudgets()
        ])
        
        const nowOnlyDate = new Date()
        nowOnlyDate.setHours(0, 0, 0, 0)
        
        const expired = budgets.filter(b => {
           const endDate = new Date(b.endDate)
           return endDate < nowOnlyDate
        }).map(b => {
           const cat = categories.find(c => c.id === b.categoryId)
           return { id: b.id, name: cat?.name || 'Unknown' }
        })
        
        setExpiredBudgets(expired)
      } catch (err) {
        console.error('Failed to fetch budgets for alerts', err)
      }
    }
    
    checkBudgets()
  }, [location.pathname]) // Refresh check when navigating

  const activeAlerts = expiredBudgets.filter(b => !dismissed[b.id])

  if (activeAlerts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {activeAlerts.map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4 shadow-2xl flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-bold text-white leading-tight mb-1">
                {t('Category Budget Expired')}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('The budget for')} <span className="font-semibold text-emerald-400">{t(alert.name)}</span> {t('has ended and will no longer track new expenses. You can replace it in the')}{' '}
                <Link to="/category-budgets" onClick={() => setDismissed(prev => ({ ...prev, [alert.id]: true }))} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                  {t('Category Budgets')}
                </Link> {t('page.')}
              </p>
            </div>
            
            <button
              onClick={() => setDismissed(prev => ({ ...prev, [alert.id]: true }))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
