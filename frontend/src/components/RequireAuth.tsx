import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredUser, getToken } from '../api/auth'
import { useEffect, useState } from 'react'

export function RequireAuth() {
  const token = getToken()
  const user = getStoredUser()
  const location = useLocation()
  
  // It's possible the token exists but the user state hasn't been synced locally. 
  // Wait to hydrate if necessary, or just rely on the token.
  const [isAuth, setIsAuth] = useState<boolean | null>(null)

  useEffect(() => {
    // Both token and user data should exist for a completely valid session in this app
    if (token && user) {
      setIsAuth(true)
    } else {
      setIsAuth(false)
    }
  }, [token, user])

  if (isAuth === null) {
    return null; // or a loading spinner
  }

  if (!isAuth) {
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