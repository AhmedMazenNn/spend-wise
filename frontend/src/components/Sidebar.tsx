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
  Menu,
  Moon,
  Sun,
  Globe,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser, logout } from '../api/auth'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const user = getStoredUser()
  const isAdmin = (user?.role || '').toLowerCase() === 'admin'
  const isArabic = i18n.language === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'

  const navItems = [
    { name: t('Dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { name: t('Transactions'), icon: ArrowLeftRight, path: '/transactions' },
    { name: t('Report'), icon: BarChart3, path: '/report' },
    { name: t('Settings'), icon: Settings, path: '/settings' },
    ...(isAdmin ? [{ name: t('Admin'), icon: ShieldCheck, path: '/admin' }] : []),
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Logout failed. Please try again.'
      setLogoutError(msg)
    } finally {
      setIsLoggingOut(false)
      setConfirmOpen(false)
      setMobileOpen(false)
    }
  }

  const closeMobile = () => setMobileOpen(false)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div
        dir={dir}
        className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-white/10"
      >
        <div className="h-16 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-200 hover:bg-white/10"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className={`flex items-center gap-2 min-w-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg shadow-glow">
              💸
            </div>
            <span className="text-white font-bold font-heading truncate">
              {t('SpendWise')}
            </span>
          </div>

          <div className="w-9" />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        dir={dir}
        className={[
          'hidden lg:flex fixed top-0 h-screen w-64 text-white flex-col z-20',
          'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
          isArabic ? 'right-0 border-l border-white/10' : 'left-0 border-r border-white/10',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="p-8">
          <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg shadow-glow">
              💸
            </div>
            <h1 className="text-xl font-bold font-heading tracking-tight">
              {t('SpendWise')}
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
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
                    'relative flex items-center px-4 py-3 rounded-full transition-colors duration-200',
                    isArabic ? 'flex-row-reverse gap-3 text-right' : 'gap-3',
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/10',
                  ].join(' ')}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Theme and Language Toggles */}
        <div className="px-4 pb-2 flex items-center justify-around">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={theme === 'dark' ? t('Light Mode') : t('Dark Mode')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center ${isArabic ? 'flex-row-reverse' : ''} gap-2`}
            title={t('English') + ' / ' + t('Arabic')}
          >
            <Globe className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">{i18n.language}</span>
          </button>
        </div>

        <div className="p-4 mt-auto border-t border-white/10">
          <div
            className={[
              'rounded-2xl p-4 flex items-center gap-3 border border-white/10 bg-white/5',
              isArabic ? 'flex-row-reverse text-right' : '',
            ].join(' ')}
          >
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user?.name || t('Guest')}
              </p>
              <p className="text-xs text-slate-300 truncate">{user?.email || ''}</p>
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

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              aria-label="Close sidebar"
            />

            <motion.aside
              dir={dir}
              className={[
                'lg:hidden fixed top-0 bottom-0 z-50 w-[86vw] max-w-xs text-white flex flex-col',
                'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
                isArabic
                  ? 'right-0 border-l border-white/10'
                  : 'left-0 border-r border-white/10',
              ].join(' ')}
              initial={{ x: isArabic ? 40 : -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isArabic ? 40 : -40, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Drawer header */}
              <div
                className={[
                  'p-4 border-b border-white/10 flex items-center justify-between',
                  isArabic ? 'flex-row-reverse' : '',
                ].join(' ')}
              >
                <div className={`flex items-center gap-3 min-w-0 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg shadow-glow">
                    💸
                  </div>
                  <h1 className="text-lg font-bold font-heading tracking-tight truncate">
                    {t('SpendWise')}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={closeMobile}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-200"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path
                  return (
                    <Link
                      to={item.path}
                      key={item.name}
                      className="block relative"
                      onClick={closeMobile}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavMobile"
                          className="absolute inset-0 bg-emerald-600/90 rounded-full"
                          initial={false}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}

                      <div
                        className={[
                          'relative flex items-center px-4 py-3 rounded-full transition-colors duration-200',
                          isArabic ? 'flex-row-reverse gap-3 text-right' : 'gap-3',
                          isActive
                            ? 'text-white'
                            : 'text-slate-300 hover:text-white hover:bg-white/10',
                        ].join(' ')}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </Link>
                  )
                })}
              </nav>

              {/* Theme and Language Toggles (Mobile) */}
              <div className="px-4 py-2 flex items-center justify-around border-t border-white/10">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={theme === 'dark' ? t('Light Mode') : t('Dark Mode')}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleLanguage}
                  className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center ${isArabic ? 'flex-row-reverse' : ''} gap-2`}
                  title={t('English') + ' / ' + t('Arabic')}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-medium uppercase">{i18n.language}</span>
                </button>
              </div>

              <div className="p-4">
                <div
                  className={[
                    'rounded-2xl p-4 flex items-center gap-3 border border-white/10 bg-white/5',
                    isArabic ? 'flex-row-reverse text-right' : '',
                  ].join(' ')}
                >
                  {user?.picture ? (
                    <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.name || t('Guest')}
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            dir={dir}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => (isLoggingOut ? null : setConfirmOpen(false))}
              aria-label="Close logout dialog"
            />

            <motion.div
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm logout"
            >
              <div
                className={[
                  'p-5 border-b border-slate-100 flex items-center justify-between',
                  isArabic ? 'flex-row-reverse' : '',
                ].join(' ')}
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('Confirm logout')}
                </h3>
                <button
                  type="button"
                  onClick={() => (isLoggingOut ? null : setConfirmOpen(false))}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-5 ${isArabic ? 'text-right' : ''}`}>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('Are you sure you want to log out?')}
                </p>

                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={isLoggingOut}
                    className="cursor-pointer w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    className="cursor-pointer w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? t('Logging out…') : t('Logout')}
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