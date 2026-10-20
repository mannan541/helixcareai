import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/store'

export function AuthGuard() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
