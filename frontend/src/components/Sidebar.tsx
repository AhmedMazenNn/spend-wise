// src/components/Sidebar.tsx
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser, logout } from '../api/auth'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const user = getStoredUser()
const isAdmin = (user?.role || '').toLowerCase() === 'admin'

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Transactions', icon: ArrowLeftRight, path: '/transactions' },
  { name: 'Report', icon: BarChart3, path: '/report' },
  { name: 'Settings', icon: Settings, path: '/settings' },
  ...(isAdmin ? [{ name: 'Admin', icon: ShieldCheck, path: '/admin' }] : []),
]

  const initials = useMemo(() => {
    const name = user?.name?.trim() || ''
    if (!name) return 'U'
    const parts = name.split(/\s+/).slice(0, 2)
    return (parts[0]?.[0] || 'U').toUpperCase() + (parts[1]?.[0] || '')
  }, [user?.name])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    try {
      await logout()
      // logout() already clears localStorage in finally
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Logout failed. Please try again.'
      setLogoutError(msg)
    } finally {
      setIsLoggingOut(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <aside
        className="
          fixed left-0 top-0 h-screen w-64 text-white flex flex-col z-20
          bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
          border-r border-white/10
        "
      >
        {/* Logo */}
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg shadow-glow">
              💸
            </div>
            <h1 className="text-xl font-bold font-heading tracking-tight">
              SpendWise
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path
            return (
              <Link to={item.path} key={item.name} className="block relative">
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-emerald-600/90 rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <div
                  className={[
                    'relative flex items-center gap-3 px-4 py-3 rounded-full transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/10',
                  ].join(' ')}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Current User + Logout */}
        <div className="p-4 mt-auto">
          <div className="rounded-2xl p-4 flex items-center gap-3 border border-white/10 bg-white/5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user?.name || 'Guest'}
              </p>
              <p className="text-xs text-slate-300 truncate">
                {user?.email || ''}
              </p>
            </div>

            <button
              onClick={() => setConfirmOpen(true)}
              className="cursor-pointer text-slate-300 hover:text-green-600 transition-colors"
              aria-label="Logout"
              type="button"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {logoutError && (
            <p className="mt-3 text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {logoutError}
            </p>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => (isLoggingOut ? null : setConfirmOpen(false))}
              aria-label="Close logout dialog"
            />

            {/* Dialog */}
            <motion.div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm logout"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Confirm logout
                </h3>
                <button
                  type="button"
                  onClick={() => (isLoggingOut ? null : setConfirmOpen(false))}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-slate-600">
                  Are you sure you want to log out?
                </p>

                <div className="mt-5 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={isLoggingOut}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar