// src/pages/Auth/VerifyEmailResult.tsx
// Handles the /verify-email?token=... link from the verification email.
// On mount, calls the backend to verify the token.
// On success: saves auth tokens and redirects to /dashboard.
// On failure: shows a clear error with a resend option.

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { verifyEmail, resendVerification } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

type VerifyState = 'loading' | 'success' | 'already_verified' | 'expired' | 'invalid'

export function VerifyEmailResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [state, setState] = useState<VerifyState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expiredEmail, setExpiredEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('invalid')
      setErrorMsg('No verification token found in the URL.')
      return
    }

    verifyEmail(token)
      .then(async (result) => {
        await refreshUser() // sync AuthContext with new user state
        if (result.alreadyVerified) {
          setState('already_verified')
        } else {
          setState('success')
        }
        setTimeout(() => navigate('/dashboard'), 2500)
      })
      .catch((err: any) => {
        if (err?.expired) {
          setState('expired')
          setExpiredEmail(err?.email ?? null)
        } else {
          setState('invalid')
          setErrorMsg(err instanceof Error ? err.message : 'Verification failed.')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResend = async () => {
    if (!expiredEmail) return
    setResendStatus('sending')
    try {
      await resendVerification(expiredEmail)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-10 text-center">
          {/* Loading */}
          {state === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verifying your email…</h2>
              <p className="text-slate-500 text-sm">Please wait a moment.</p>
            </motion.div>
          )}

          {/* Success */}
          {(state === 'success' || state === 'already_verified') && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {state === 'already_verified' ? 'Already verified!' : 'Email verified! 🎉'}
              </h2>
              <p className="text-slate-500 text-sm">
                {state === 'already_verified'
                  ? 'Your account was already verified. Redirecting to your dashboard…'
                  : 'Your account is now active. Redirecting you to the dashboard…'}
              </p>
              <div className="flex justify-center">
                <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Expired token */}
          {state === 'expired' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Link expired</h2>
              <p className="text-slate-500 text-sm">
                This verification link has expired. Request a new one below.
              </p>
              {expiredEmail && (
                <p className="text-slate-700 font-medium text-sm">Email: {expiredEmail}</p>
              )}

              {resendStatus === 'idle' && (
                <button
                  onClick={handleResend}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Send new verification email
                </button>
              )}
              {resendStatus === 'sending' && (
                <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                </p>
              )}
              {resendStatus === 'sent' && (
                <p className="text-emerald-700 text-sm font-medium">
                  ✓ New verification email sent! Check your inbox.
                </p>
              )}
              {resendStatus === 'error' && (
                <p className="text-red-600 text-sm">Failed to resend. Please try again later.</p>
              )}
            </motion.div>
          )}

          {/* Invalid token */}
          {state === 'invalid' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Invalid link</h2>
              <p className="text-slate-500 text-sm">
                {errorMsg ?? 'This verification link is invalid or has already been used.'}
              </p>
            </motion.div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link to="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyEmailResult
