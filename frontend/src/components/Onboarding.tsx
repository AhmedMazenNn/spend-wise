import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Wallet, 
  TrendingUp, 
  PieChart, 
  PlusCircle,
  Lightbulb,
  Globe
} from 'lucide-react'
import { completeOnboarding as apiCompleteOnboarding } from '../api/auth'

interface OnboardingProps {
  onComplete: () => void
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [currentStep, setCurrentStep] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)

  const steps = [
    {
      title: t('Welcome to SpendWise!'),
      description: t("Let's get you started with a quick tour of your new financial companion."),
      icon: <Wallet className="h-12 w-12 text-emerald-500" />,
      color: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    {
      title: t('Track Every Expense'),
      description: t('Log your spending in seconds. Categorize with emojis and keep notes for better clarity.'),
      icon: <PlusCircle className="h-12 w-12 text-blue-500" />,
      color: 'bg-blue-50 dark:bg-blue-500/10'
    },
    {
      title: t('Smart Budgets'),
      description: t('Set monthly limits and watch the progress bar change colors as you reach your goals.'),
      icon: <TrendingUp className="h-12 w-12 text-orange-500" />,
      color: 'bg-orange-50 dark:bg-orange-500/10'
    },
    {
      title: t('Insights & Reports'),
      description: t('Beautiful charts show exactly where your money goes. Export to PDF or Excel anytime.'),
      icon: <PieChart className="h-12 w-12 text-purple-500" />,
      color: 'bg-purple-50 dark:bg-purple-500/10'
    },
    {
      title: t('How to use'),
      description: t("Click the '+' button to add an expense. Go to 'Budgets' to set limits. Use the Dashboard for a quick summary."),
      icon: <Lightbulb className="h-12 w-12 text-yellow-500" />,
      color: 'bg-yellow-50 dark:bg-yellow-500/10'
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleFinish()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    setIsFinishing(true)
    try {
      await apiCompleteOnboarding()
      onComplete()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // Even if API fails, we should let user proceed locally
      onComplete()
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-700">
            <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
              {t('SpendWise')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                title={t('Switch Language')}
              >
                <Globe className="h-5 w-5" />
              </button>
              <button 
                onClick={handleFinish}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 text-center sm:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: isArabic ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isArabic ? 20 : -20, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-3xl ${steps[currentStep].color}`}>
                  {steps[currentStep].icon}
                </div>
                <h3 className="mb-4 text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  {steps[currentStep].title}
                </h3>
                <p className="text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                  {steps[currentStep].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
            <button
              onClick={handleFinish}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {t('Skip Tour')}
            </button>

            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep 
                      ? 'w-6 bg-emerald-500' 
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  {isArabic ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isFinishing}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {currentStep === steps.length - 1 ? t('Get Started') : t('Next')}
                {currentStep < steps.length - 1 && (
                  isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default Onboarding
