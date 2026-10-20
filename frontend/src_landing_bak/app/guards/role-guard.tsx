import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/store'
import type { UserRole } from '@/core/types'

interface RoleGuardProps {
  allowedRoles: UserRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, hasRole } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
