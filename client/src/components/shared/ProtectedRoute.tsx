import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

interface Props {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  if (!_hasHydrated) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()
  if (!_hasHydrated) return null
  if (isAuthenticated) {
    const dest = user?.role === 'PASSENGER' ? '/account/bookings' : '/admin'
    return <Navigate to={dest} replace />
  }
  return <Outlet />
}
