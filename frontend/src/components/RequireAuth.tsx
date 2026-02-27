import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getToken } from '../api/auth'

export function RequireAuth() {
  const token = getToken()
  const location = useLocation()

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}