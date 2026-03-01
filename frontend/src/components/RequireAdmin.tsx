import { Navigate, Outlet } from 'react-router-dom'
import { getStoredUser, getToken } from '../api/auth'

export function RequireAdmin() {
  const token = getToken()
  const user = getStoredUser()
  const isAdmin = (user?.role || '').toLowerCase() === 'admin'

  // Not logged in
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Logged in but not admin
  if (!isAdmin) {
    // choose where you want to send them:
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}