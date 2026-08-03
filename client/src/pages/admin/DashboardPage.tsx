import { useQuery } from '@tanstack/react-query'
import { Bus, BookOpen, TrendingUp, Clock } from 'lucide-react'
import { adminApi } from '@/api'
import { formatCurrency } from '@/lib/utils'

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 60_000,
  })

  const stats = [
    { label: "Today's Trips", value: data?.today.trips ?? '—', icon: Bus, color: 'text-primary bg-primary/10' },
    { label: "Today's Bookings", value: data?.today.bookings ?? '—', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { label: "Today's Revenue", value: data ? formatCurrency(data.today.revenue) : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { label: 'Pending Payments', value: data?.allTime.pendingPayments ?? '—', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Today's operations at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : s.value}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">All-time Bookings</p>
          <p className="text-3xl font-bold text-gray-900">{isLoading ? '...' : data?.allTime.bookings}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">All-time Revenue</p>
          <p className="text-3xl font-bold text-primary">{isLoading ? '...' : data ? formatCurrency(data.allTime.revenue) : '—'}</p>
        </div>
      </div>
    </div>
  )
}
