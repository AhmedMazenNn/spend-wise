// src/pages/Settings/Settings.tsx
import { useEffect, useMemo, useState } from 'react'
import { logout } from '../../api/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '../../components/Sidebar'
import { Save, Trash2, X } from 'lucide-react'
import {
  fetchProfile,
  updateMe,
  changePassword,
  deleteMe,
  getStoredUser,
} from '../../api/auth'
import { useNavigate } from 'react-router-dom'

function initialsFromName(name?: string) {
  const n = (name || '').trim()
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  return (parts[0]?.[0] || 'U').toUpperCase() + (parts[1]?.[0] || '')
}

export function Settings() {
  const navigate = useNavigate()

  const stored = getStoredUser()

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [toast, setToast] = useState<string | null>(null)

  const [name, setName] = useState(stored?.name ?? '')
  const [email, setEmail] = useState(stored?.email ?? '')
  const [phone, setPhone] = useState(stored?.phone ?? '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const initials = useMemo(() => initialsFromName(name), [name])

  useEffect(() => {
    let alive = true

    async function load() {
      setProfileLoading(true)
      setProfileError(null)

      try {
        const res = await fetchProfile()
        if (!alive) return

        const u = res.user
        setName(u?.name ?? '')
        setEmail(u?.email ?? '')
        setPhone(u?.phone ?? '')
      } catch (err) {
        if (!alive) return
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load profile. Please try again.'
        setProfileError(msg)
      } finally {
        if (alive) setProfileLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)
    try {
      const res = await updateMe({ name, email, phone })
      const existing = getStoredUser()
      if (existing) {
        localStorage.setItem('user', JSON.stringify(res.user))
      }
      showToast('Profile updated successfully.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setProfileError(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setProfileError('Please fill current and new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setProfileError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    setProfileError(null)

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      localStorage.removeItem('token')
      localStorage.removeItem('user')

      try {
        await logout()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // ignore
      }

      navigate('/', { replace: true, state: { passwordChanged: true } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.'
      setProfileError(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteMe()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.'
      setDeleteError(msg)
    } finally {
      setDeleteLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      {/* ✅ Responsive main: no ml on mobile, add top padding for mobile top bar, responsive padding */}
      <main className="flex-1 lg:ml-64 pt-20 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12"
        >
          {/* Header */}
          <motion.header
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
              Settings
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Manage your account
            </p>
          </motion.header>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Errors */}
          {profileError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
              {profileError}
            </div>
          )}

          {/* Profile Information */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900">
                  Profile Information
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Update your personal details.
                </p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={profileLoading || savingProfile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className="mt-8 flex flex-col md:flex-row gap-8">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-not-allowed">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-emerald-100 flex items-center justify-center text-3xl sm:text-4xl font-bold text-emerald-700 border-4 border-white shadow-lg overflow-hidden">
                    {initials}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-slate-400 cursor-not-allowed"
                  title="Avatar upload not implemented yet"
                />
              </div>

              {/* Form Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={profileLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={profileLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={profileLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900">
                  Security
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Change your password.
                </p>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </div>

            <div className="mt-6 w-full max-w-md space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-50/50 rounded-2xl p-5 sm:p-8 shadow-sm border border-red-200"
          >
            <h2 className="text-lg sm:text-xl font-bold font-heading text-red-700 mb-2">
              Danger Zone
            </h2>
            <p className="text-red-600/80 mb-6 text-sm">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>

            <button
              onClick={() => setDeleteOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete Account
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => (deleteLoading ? null : setDeleteOpen(false))}
              aria-label="Close delete dialog"
            />

            <motion.div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete account"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Delete account
                </h3>
                <button
                  type="button"
                  onClick={() => (deleteLoading ? null : setDeleteOpen(false))}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-slate-600">
                  This action is permanent. Are you sure you want to delete your
                  account?
                </p>

                {deleteError && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {deleteError}
                  </p>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleteLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Settings