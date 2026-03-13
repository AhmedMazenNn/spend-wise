// src/pages/Auth/Register.tsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { GoogleAuthButton } from '../../components/GoogleAuthButton'

export function Register() {
  const { signup } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const isArabic = i18n.language === 'ar'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: [t('Passwords do not match')] })
      return
    }

    setIsSubmitting(true)
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone
      })
      // Fixed: Removed '/auth' prefix as it leads to 404
      navigate(`/verify-email-pending?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        const errors: Record<string, string[]> = {}
        err.errors.forEach((e: any) => {
          if (!errors[e.field]) errors[e.field] = []
          errors[e.field].push(t(e.message))
        })
        setFieldErrors(errors)
        
        // Also set a generic error if it helps user context
        if (err.message && err.message !== 'Validation failed') {
          setError(t(err.message))
        }
      } else {
        setError(err instanceof Error ? err.message : t('Registration failed. Please try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInputClass = (fieldName: string, hasEndIcon = false) => {
    const base = `w-full ${isArabic 
      ? `pr-12 ${hasEndIcon ? 'pl-11' : 'pl-4'} text-right` 
      : `pl-12 ${hasEndIcon ? 'pr-11' : 'pr-4'} text-left`
    } py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white`
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
        <div className="flex flex-col md:flex-row min-h-[600px]">
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
              
              <div className="mt-12 space-y-6 hidden md:block">
                <div className="flex items-center gap-4 text-emerald-50 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">✨</div>
                  <p className="text-sm font-medium">{t('Smart budget tracking')}</p>
                </div>
                <div className="flex items-center gap-4 text-emerald-50 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">📊</div>
                  <p className="text-sm font-medium">{t('Detailed financial insights')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('Create Account')}</h2>
              <p className="text-slate-500 dark:text-slate-400">{t('Join the community of smart savers.')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="relative group">
                    <User className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors`} />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={getInputClass('name')}
                      placeholder={t('Full Name')}
                    />
                  </div>
                  {fieldErrors.name && fieldErrors.name.map((msg, i) => (
                    <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                  ))}
                </div>

                {/* Email */}
                <div className="space-y-1 sm:col-span-2">
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
                    className={getInputClass('password', true)}
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
                  {fieldErrors.password ? fieldErrors.password.map((msg, i) => (
                    <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                  )) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                      {t('e.g., Password123!')}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <div className="relative group">
                    <Lock className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={getInputClass('confirmPassword')}
                      placeholder={t('Confirm Password')}
                    />
                  </div>
                  {fieldErrors.confirmPassword && fieldErrors.confirmPassword.map((msg, i) => (
                    <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                  ))}
                </div>

                {/* Phone */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="relative group">
                    <Phone className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors`} />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={getInputClass('phone')}
                      placeholder={t('Phone Number')}
                    />
                  </div>
                  {fieldErrors.phone && fieldErrors.phone.map((msg, i) => (
                    <p key={i} className="text-[11px] text-red-500 px-1 font-medium italic animate-pulse">{msg}</p>
                  ))}
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
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl font-heading font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? t('Creating account…') : t('Sign Up')}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('or')}</span>
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            </div>

            <GoogleAuthButton intent="register" />

            <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-medium">
              {t('Already have an account?')}{' '}
              <Link to="/" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline ml-1">
                {t('Sign In')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register