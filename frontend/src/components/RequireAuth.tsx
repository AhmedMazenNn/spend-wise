import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from './LoadingScreen'

import { GlobalAlerts } from './GlobalAlerts'

export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    console.log('[RequireAuth] Still loading...');
    return <LoadingScreen />
  }

  console.log('[RequireAuth] Rendering. Auth:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('[RequireAuth] Not authenticated, redirecting to /');
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return (
    <>
      <GlobalAlerts />
      <Outlet />
    </>
  )
}