import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowRight, Bus, Snowflake, Wifi, UtensilsCrossed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { tripsApi } from '@/api'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Select } from '@/components/shared'
import type { Trip, TripStatus } from '@/types'

const STATUS_COLORS: Record<TripStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  BOARDING: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

// Monday–Sunday of the week containing `d`, as YYYY-MM-DD.
function getThisWeekRange(d = new Date()) {
  const day = d.getDay() // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const toISODate = (x: Date) => x.toISOString().split('T')[0]
  return { from: toISODate(monday), to: toISODate(sunday) }
}

export function AdminTripsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('')
  const thisWeek = getThisWeekRange()
  const [dateFrom, setDateFrom] = useState(thisWeek.from)
  const [dateTo, setDateTo] = useState(thisWeek.to)

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['admin-trips', statusFilter, dateFrom, dateTo],
    queryFn: () => tripsApi.findAll({ status: statusFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripStatus }) => tripsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin-trips'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Trips</h1>
        <button onClick={() => navigate('/admin/trips/new')} className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-colors">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2.5 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2.5 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <button
          type="button"
          onClick={() => { const w = getThisWeekRange(); setDateFrom(w.from); setDateTo(w.to) }}
          className="text-xs font-semibold text-primary hover:underline"
        >
          This week
        </button>
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as TripStatus | '')}
          placeholder="All statuses"
          options={[
            { value: '', label: 'All statuses' },
            ...(['SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as TripStatus[]).map((s) => ({ value: s, label: s })),
          ]}
          className="px-3 py-2.5 bg-white border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[10rem]"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading trips...</div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center text-gray-500">No trips found</div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={() => navigate(`/admin/trips/${trip.id}`)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-gray-900">{trip.route.originStop.name}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-gray-900">{trip.route.destinationStop.name}</span>
                <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[trip.status]}`}>{trip.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{formatDateTime(trip.departureDateTime)}</span>
                <span className="flex items-center gap-1"><Bus className="w-3.5 h-3.5" />{trip.car.make} {trip.car.model}</span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  {trip.car.hasAC && <span title="AC"><Snowflake className="w-3.5 h-3.5" /></span>}
                  {trip.car.hasWifi && <span title="Wi-Fi"><Wifi className="w-3.5 h-3.5" /></span>}
                  {trip.car.hasMeals && <span title="Meals"><UtensilsCrossed className="w-3.5 h-3.5" /></span>}
                </span>
                <span className="ml-auto text-gray-400 text-xs">{trip._count?.bookings ?? 0}/{trip.car.capacity} seats</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
