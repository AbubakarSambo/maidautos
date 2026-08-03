import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, Route, Bus, Car, Users, BookOpen, LogOut, Menu, X, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/trips', label: 'Trips', icon: Bus },
  { to: '/admin/bookings', label: 'Bookings', icon: BookOpen },
  { to: '/admin/stops', label: 'Stops', icon: MapPin },
  { to: '/admin/routes', label: 'Routes', icon: Route },
  { to: '/admin/cars', label: 'Fleet', icon: Car },
  { to: '/admin/drivers', label: 'Drivers', icon: UserCheck },
]

const superAdminNav: NavItem[] = [
  { to: '/admin/users', label: 'Team', icon: Users },
]

export function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const nav = user?.role === 'SUPER_ADMIN' ? [...adminNav, ...superAdminNav] : adminNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform lg:static lg:translate-x-0 text-white bg-primary-dark',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/5">
          <img src="/logo.png" alt="MaidAutos" className="h-8 w-auto brightness-0 invert" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                  style={({ isActive }) => (isActive ? { color: '#ffb4a8' } : undefined)}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ color: '#ffb4a8' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/40 truncate">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : `Admin${user?.adminCity ? ` · ${user.adminCity}` : ''}`}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-surface border-b border-outline-variant flex items-center px-4 lg:px-6 gap-4">
          <button
            className="lg:hidden p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
