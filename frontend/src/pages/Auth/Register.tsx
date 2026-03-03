// /src/pages/Auth/Register.tsx

import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '../../api/auth'
import { GoogleAuthButton } from '../../components/GoogleAuthButton'

const Register = () => {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      await signup({
        name,
        email,
        password,
        confirmPassword,
        phone,
      })

      // If your backend returns tokens and you store them in signup(), great.
      // Otherwise you might want to navigate to /login instead.
      navigate('/dashboard')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to register. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
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
        {/* Header Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg mb-4 border border-white/30">
              🚀
            </div>
            <h1 className="text-3xl font-bold font-heading text-white mb-1">
              Create Account
            </h1>
            <p className="text-emerald-100 text-sm">Join SpendWise today.</p>
          </motion.div>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Name */}
              <div className="relative group">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent"
                  placeholder="Full Name"
                  required
                  autoComplete="name"
                />
                <label
                  htmlFor="name"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all
                    peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5
                    peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1
                    peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
                    pointer-events-none"
                >
                  Full Name
                </label>
              </div>

              {/* Email */}
              <div className="relative group">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent"
                  placeholder="Email"
                  required
                  autoComplete="email"
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all
                    peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5
                    peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1
                    peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
                    pointer-events-none"
                >
                  Email Address
                </label>
              </div>

              {/* Password */}
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent pr-12"
                  placeholder="Password"
                  required
                  autoComplete="new-password"
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all
                    peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5
                    peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1
                    peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
                    pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative group">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent pr-12"
                  placeholder="Confirm Password"
                  required
                  autoComplete="new-password"
                />
                <label
                  htmlFor="confirmPassword"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all
                    peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5
                    peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1
                    peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
                    pointer-events-none"
                >
                  Confirm Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Phone */}
              <div className="relative group">
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-transparent"
                  placeholder="Phone Number"
                  required
                  autoComplete="tel"
                />
                <label
                  htmlFor="phone"
                  className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all
                    peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5
                    peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-1
                    peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1
                    pointer-events-none"
                >
                  Phone Number
                </label>
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
              {isSubmitting ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-slate-400 text-sm font-medium">or continue with</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <GoogleAuthButton />
          </div>

          <p className="text-center mt-8 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/" className="text-emerald-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
export default Register