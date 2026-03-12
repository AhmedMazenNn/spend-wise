// src/pages/Auth/VerifyEmailPending.tsx
// Shown immediately after email/password registration.
// Tells the user to check their inbox, and lets them resend the email.

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resendVerification } from '../../api/auth'

export function VerifyEmailPending() {
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const email = searchParams.get('email') ?? ''
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isArabic = i18n.language === 'ar'

  const handleResend = async () => {
    if (!email || status === 'sending' || status === 'sent') return
    setStatus('sending')
    setErrorMsg(null)
    try {
      await resendVerification(email)
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('Failed to resend. Please try again.'))
      setStatus('error')
    }
  }

  return (
    <div 
      className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-100/50 dark:bg-emerald-900/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 dark:bg-blue-900/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 border border-white/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-white mb-1">{t('Verify Your Email')}</h1>
            <p className="text-emerald-100 text-sm">{t('Account Created!')}</p>
          </motion.div>
        </div>

        {/* Body */}
        <div className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            {t("We've sent a verification link to")}
          </p>
          <p className="text-slate-900 dark:text-white font-semibold text-lg mb-6 break-all">{email || t('your email address')}</p>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 text-left space-y-3 mb-8 border border-slate-100 dark:border-slate-700">
            {[
              t('Open the email from SpendWise'),
              t('Click the "Verify Email" button'),
              t("You'll be signed in automatically"),
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t("Didn't receive it?")} {t('Check your spam folder')}, {t('or')}:
          </p>

          {status === 'sent' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              {t('Verification email sent! Check your inbox.')}
            </div>
          ) : status === 'error' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMsg}
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="text-sm text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700"
              >
                {t('Try again')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={status === 'sending'}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${status === 'sending' ? 'animate-spin' : ''}`} />
              {status === 'sending' ? t('Sending…') : t('Resend verification email')}
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Link to="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {isArabic ? '← ' + t('Back to Login') : '← ' + t('Back to Login')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyEmailPending
