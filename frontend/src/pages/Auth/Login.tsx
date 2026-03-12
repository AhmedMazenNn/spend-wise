// src/pages/Auth/Login.tsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { GoogleAuthButton } from '../../components/GoogleAuthButton'
import { resendVerification } from '../../api/auth'

export function Login() {
  const { login } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const isArabic = i18n.language === 'ar'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})
    setVerificationRequired(false)

    try {
      await login(formData)
      navigate('/dashboard')
    } catch (err: any) {
      if (err.requiresVerification) {
        setVerificationRequired(true)
      }
      
      if (err.errors && Array.isArray(err.errors)) {
        const errors: Record<string, string[]> = {}
        err.errors.forEach((e: any) => {
          if (!errors[e.field]) errors[e.field] = []
          errors[e.field].push(t(e.message))
        })
        setFieldErrors(errors)
        
        if (err.message && err.message !== 'Validation failed') {
          setError(t(err.message))
        }
      } else {
        setError(err instanceof Error ? err.message : t('Login failed'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendStatus === 'sending' || resendStatus === 'sent') return
    setResendStatus('sending')
    try {
      await resendVerification(formData.email)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  const getInputClass = (fieldName: string) => {
    const base = `w-full ${isArabic ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white`
    if (fieldErrors[fieldName]) {
      return `${base} border-red-500 dark:border-red-500 ring-red-100 dark:ring-red-900/20`
    }
    return `${base} border-slate-200 dark:border-slate-700`
  }

  return (
    <div 
      className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-100/40 dark:bg-emerald-900/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"
      >
        <div className="flex flex-col md:flex-row min-h-[550px]">
          {/* Left Side - Brand */}
          <div className="md:w-5/12 bg-gradient-to-br from-emerald-600 to-emerald-500 p-10 text-white relative overflow-hidden flex flex-col justify-center text-center md:text-left">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="relative z-10">
              <motion.div 
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] mx-auto md:mx-0 flex items-center justify-center text-4xl shadow-lg mb-8 border border-white/30"
              >
                💸
              </motion.div>
              <h1 className="text-4xl font-bold font-heading mb-4 leading-tight">SpendWise</h1>
              <p className="text-emerald-50 text-lg opacity-90 leading-relaxed max-w-[280px] mx-auto md:mx-0">
                {t('Master your money, effortlessly.')}
              </p>
              
              <div className="mt-12 space-y-4 hidden md:block">
                <p className="text-sm italic opacity-80">{t('Welcome back to your financial control center.')}</p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('Welcome Back')}</h2>
              <p className="text-slate-500 dark:text-slate-400">{t('Please sign in to your accounts.')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1">
                  <div className="relative group">
                    <Mail className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors`} />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={getInputClass('email')}
                      placeholder={t('Email Address')}
                    />
                  </div>
                  {fieldErrors.email && fieldErrors.email.map((msg, i) => (
                    <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                  ))}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="relative group">
                    <Lock className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={getInputClass('password')}
                      placeholder={t('Password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isArabic ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors`}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className={`flex justify-end gap-2`}>
                    {fieldErrors.password && (
                      <div className="flex-1">
                        {fieldErrors.password.map((msg, i) => (
                          <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                        ))}
                      </div>
                    )}
                    <Link to="/auth/forgot-password" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
                      {t('Forgot Password?')}
                    </Link>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div className="flex-1">
                      <p>{t(error)}</p>
                      {verificationRequired && (
                        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                          {resendStatus === 'sent' ? (
                            <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle size={14} /> {t('Verification email sent!')}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResend}
                              disabled={resendStatus === 'sending'}
                              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              {resendStatus === 'sending' ? t('Sending…') : t('Resend verification email')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-heading font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('Signing In…') : t('Sign In')}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('or')}</span>
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            </div>

            <GoogleAuthButton intent="login" />

            <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-medium">
              {t("Don't have an account?")}{' '}
              <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline ml-1">
                {t('Sign Up')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
