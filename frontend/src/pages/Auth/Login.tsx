// src/pages/Auth/Login.tsx
import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { GoogleAuthButton } from '../../components/GoogleAuthButton'
import { resendVerification } from '../../api/auth'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Shown when the server returns requiresVerification: true
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPendingEmail(null)
    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err: any) {
      if (err?.requiresVerification) {
        setPendingEmail(err?.email || email)
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    setResendStatus('sending')
    try {
      await resendVerification(pendingEmail)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10"
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
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg mb-4 border border-white/30">
              💸
            </div>
            <h1 className="text-3xl font-bold font-heading text-white mb-1">SpendWise</h1>
            <p className="text-emerald-100 text-sm">Master your money, effortlessly.</p>
          </motion.div>
        </div>

        {/* Form */}
        <div className="p-8 pt-10">
          {/* Password-changed banner */}
          {location.state?.passwordChanged && (
            <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Your password has been changed. Please sign in with your new password.
            </p>
          )}

          {/* Email-not-verified banner */}
          {pendingEmail && (
            <div className="mb-4 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium">Email not verified</p>
                  <p className="text-amber-700 mt-0.5">
                    Please check your inbox for <strong>{pendingEmail}</strong> and click the
                    verification link.
                  </p>
                  {resendStatus === 'idle' && (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="mt-2 text-emerald-700 font-semibold underline text-xs hover:text-emerald-800"
                    >
                      Resend verification email
                    </button>
                  )}
                  {resendStatus === 'sending' && (
                    <p className="mt-2 text-xs text-amber-600">Sending…</p>
                  )}
                  {resendStatus === 'sent' && (
                    <p className="mt-2 text-xs text-emerald-700 font-medium">
                      ✓ Verification email sent! Check your inbox.
                    </p>
                  )}
                  {resendStatus === 'error' && (
                    <p className="mt-2 text-xs text-red-600">
                      Failed to resend. Please try again in a few minutes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="relative group">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent"
                  placeholder="Email"
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1 pointer-events-none"
                >
                  Email Address
                </label>
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent pr-12"
                  placeholder="Password"
                  required
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1 pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-heading font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-slate-400 text-sm font-medium">or continue with</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Google button — login intent only */}
          <GoogleAuthButton intent="login" />

          <p className="text-center mt-8 text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Troubleshoot: Clear local cache &amp; reload
            </button>
            <p className="text-[10px] text-slate-300 text-center mt-1">
              (If you still see 401 errors, please manually clear your browser cookies for localhost)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
