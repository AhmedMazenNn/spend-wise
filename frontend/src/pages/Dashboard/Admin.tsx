// /src/pages/Admin/Admin.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from '../../components/Sidebar'
import {
  Users,
  Activity,
  UserPlus,
  Crown,
  Search,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import {
  getAllUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
  type User,
  getStoredUser,
} from '../../api/auth'

type UserRow = User & {
  // derived UI fields
  initials: string
  status: 'Active' | 'Inactive'
  statusClass: string
  plan: 'Admin' | 'User'
  planClass: string
  signedUpLabel: string
}
const user = getStoredUser()

function initialsFromName(name?: string) {
  const n = (name || '').trim()
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  const init = parts.map((p) => p[0]?.toUpperCase()).join('')
  return init || 'U'
}

function formatSignedUp(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function isLikelyActive(createdAt?: string) {
  // If you don't have lastLogin/active flags, we'll treat users created in last 30 days as "Active"
  if (!createdAt) return true
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return true
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

export function Admin() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  // ✅ Real data from API
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  // Search
  const [query, setQuery] = useState('')

  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete confirmation (UI modal)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setUsersError(null)
    try {
      const res = await getAllUsers()
      setUsers(res.users ?? [])
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to load users. Please try again.'
      setUsersError(msg)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  function openEditModal(user: User) {
    setEditingUser(user)
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      role: (user.role ?? 'user').toLowerCase(),
      password: '',
    })
    setEditError(null)
  }

  function closeEditModal() {
    setEditingUser(null)
    setEditError(null)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    const userId = editingUser?.id ?? (editingUser as User & { _id?: string })?._id
    if (!userId) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const updates: {
        name?: string
        email?: string
        role?: string
        phone?: string
        password?: string
      } = {}
      if (editForm.name.trim()) updates.name = editForm.name.trim()
      if (editForm.email.trim()) updates.email = editForm.email.trim()
      if (editForm.phone.trim()) updates.phone = editForm.phone.trim()
      if (editForm.role) updates.role = editForm.role
      if (editForm.password) updates.password = editForm.password
      if (Object.keys(updates).length === 0) {
        setEditError('Change at least one field.')
        setEditSubmitting(false)
        return
      }
      await updateUserByAdmin(userId, updates)
      closeEditModal()
      await loadUsers()
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update user.',
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  function openDeleteModal(user: User) {
    setDeleteTarget(user)
    setDeleteError(null)
    setDeleteOpen(true)
  }
  
  function closeDeleteModal() {
    if (deletingId) return // prevent closing while deleting
    setDeleteOpen(false)
    setDeleteTarget(null)
    setDeleteError(null)
  }
  
  async function confirmDelete() {
    if (!deleteTarget) return
    const userId = deleteTarget.id ?? (deleteTarget as User & { _id?: string })._id
    if (!userId) return
  
    setDeletingId(userId)
    setDeleteError(null)
  
    try {
      await deleteUserByAdmin(userId)
      await loadUsers()
      closeDeleteModal()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.'
      setDeleteError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  // Derived + UI friendly rows
  const userRows: UserRow[] = useMemo(() => {
    return users.map((u) => {
      const active = isLikelyActive(u.createdAt)
      const status: UserRow['status'] = active ? 'Active' : 'Inactive'
      const statusClass = active
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-slate-100 text-slate-600'

      const role = (u.role || '').toLowerCase()
      const plan: UserRow['plan'] = role === 'admin' ? 'Admin' : 'User'
      const planClass =
        plan === 'Admin'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-600'

      // Simple deterministic color based on email/name
      const seed = (u.email || u.name || 'user').length % 8
      const avatarColorClasses = [
        'bg-purple-100 text-purple-700',
        'bg-blue-100 text-blue-700',
        'bg-orange-100 text-orange-700',
        'bg-emerald-100 text-emerald-700',
        'bg-pink-100 text-pink-700',
        'bg-slate-100 text-slate-700',
        'bg-indigo-100 text-indigo-700',
        'bg-teal-100 text-teal-700',
      ]
      const avatarClass = avatarColorClasses[seed]

      return {
        ...u,
        initials: initialsFromName(u.name),
        status,
        statusClass,
        plan,
        planClass: planClass,
        signedUpLabel: formatSignedUp(u.createdAt),
        // reuse a single class field for avatar like your demo data
        // (kept as statusClass/planClass separately)
        color: avatarClass,
      } as UserRow
    })
  }, [users])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return userRows
    return userRows.filter((u) => {
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      )
    })
  }, [userRows, query])

  // Stats from real data
  const totalUsers = users.length
  const activeUsers = userRows.filter((u) => u.status === 'Active').length
  const newThisWeek = userRows.filter((u) => {
    if (!u.createdAt) return false
    const d = new Date(u.createdAt)
    if (Number.isNaN(d.getTime())) return false
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return days <= 7
  }).length
  const adminUsers = userRows.filter((u) => u.plan === 'Admin').length

  // Charts (still demo for signups, but user status pie is real)
  const signupData = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        date: `Day ${i + 1}`,
        signups: Math.floor(Math.random() * 50) + 20,
      })),
    [],
  )

  const userStatusData = useMemo(() => {
    const inactive = totalUsers - activeUsers
    const newUsers = newThisWeek
    return [
      { name: 'Active', value: activeUsers, color: '#10B981' },
      { name: 'Inactive', value: Math.max(inactive, 0), color: '#CBD5E1' },
      { name: 'New', value: newUsers, color: '#60A5FA' },
    ]
  }, [activeUsers, totalUsers, newThisWeek])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="flex justify-between items-end"
          >
            <div>
              <h1 className="text-3xl font-bold font-heading text-slate-900">
                Admin Dashboard
              </h1>
              <h2>Welcome, {user?.name}</h2>
              <p className="text-slate-500 mt-1">
                User activity and platform analytics
              </p>
            </div>
          </motion.header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Total Users',
                value: totalUsers.toLocaleString(),
                icon: Users,
                color: 'bg-emerald-100 text-emerald-600',
              },
              {
                label: 'Active (≈30d)',
                value: activeUsers.toLocaleString(),
                icon: Activity,
                color: 'bg-blue-100 text-blue-600',
              },
              {
                label: 'New This Week',
                value: newThisWeek.toLocaleString(),
                icon: UserPlus,
                color: 'bg-purple-100 text-purple-600',
              },
              {
                label: 'Admin Users',
                value: adminUsers.toLocaleString(),
                icon: Crown,
                color: 'bg-amber-100 text-amber-600',
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="bg-white p-6 rounded-2xl shadow-card flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-medium">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold font-heading text-slate-900">
                    {stat.value}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sign-ups Chart (demo) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">
                Daily Sign-ups (demo)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signupData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar
                      dataKey="signups"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* User Activity Breakdown (real) */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">
                User Status
              </h3>
              <div className="h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {userStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-2xl font-bold font-heading text-slate-900">
                      {totalUsers.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">Users</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-4">
                {userStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Users Table */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold font-heading text-slate-900">
                Users
              </h3>

              <div className="flex items-center gap-3">
                {loadingUsers && (
                  <span className="text-sm text-slate-500">Loading…</span>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
                  />
                </div>
              </div>
            </div>

            {usersError && (
              <div className="p-6">
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {usersError}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-medium border-b border-slate-100">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Signed Up</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {!loadingUsers && filteredRows.length === 0 ? (
                    <tr>
                      <td
                        className="px-6 py-8 text-sm text-slate-500"
                        colSpan={6}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((user, index) => {
                      // avatar classes from our derived row
                      const avatarClass =
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (user as any).color ||
                        'bg-slate-100 text-slate-700'

                      return (
                        <tr
                          key={user.id || user.email || index}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarClass}`}
                                title={user.name}
                              >
                                {user.initials}
                              </div>
                              <span className="font-medium text-slate-900">
                                {user.name || '—'}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {user.email || '—'}
                          </td>

                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {user.signedUpLabel}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.statusClass}`}
                            >
                              {user.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.planClass}`}
                            >
                              {user.plan}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit user"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(user)}
                                disabled={deletingId === (user.id ?? (user as User & { _id?: string })._id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    Edit user
                  </h3>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                  {editError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          role: e.target.value as 'user' | 'admin',
                        }))
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {editSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </motion.div>
        {/* Delete User Modal */}
{deleteOpen && deleteTarget && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete user"
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h3 className="text-lg font-bold font-heading text-slate-900">
          Delete user
        </h3>
        <button
          type="button"
          onClick={closeDeleteModal}
          disabled={!!deletingId}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-900">
            {deleteTarget.name || deleteTarget.email || 'this user' }
          </span> 
          ? This action cannot be undone.
        </p>

        {deleteError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {deleteError}
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={!!deletingId}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirmDelete}
            disabled={!!deletingId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            {deletingId ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </motion.div>
  </div>
  )}
      </main>
    </div>
  )
}

export default Admin