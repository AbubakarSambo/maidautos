import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, Bus, Calendar } from 'lucide-react'
import { tripsApi } from '@/api'
import { cn, formatCurrency, formatDuration } from '@/lib/utils'
import type { Route, Trip } from '@/types'

function dayLabel(offset: number) {
  if (offset === 0) return 'Today'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-NG', { weekday: 'short' })
}

function dateForOffset(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function tripTime(dateTime: string) {
  return new Date(dateTime).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

export function RouteScheduleCard({ route }: { route: Route }) {
  const navigate = useNavigate()
  const [dayOffset, setDayOffset] = useState(0)
  const date = dateForOffset(dayOffset)

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['route-trips', route.id, date],
    queryFn: () => tripsApi.search(route.originStopId, route.destinationStopId, date),
  })

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-on-surface">{route.originStop.name}</span>
          <ArrowRight className="w-4 h-4 text-gray-muted" />
          <span className="font-display text-lg font-bold text-on-surface">{route.destinationStop.name}</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-on-surface-variant">
          <Clock className="w-3.5 h-3.5" />
          {formatDuration(route.estimatedDurationMinutes)}
        </span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 px-5 md:px-6 py-3 overflow-x-auto border-b border-outline-variant [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: 7 }, (_, i) => i).map((offset) => (
          <button
            key={offset}
            onClick={() => setDayOffset(offset)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
              dayOffset === offset
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-rose'
            )}
          >
            {dayLabel(offset)}
          </button>
        ))}
      </div>

      {/* Trips for selected day */}
      <div className="p-5 md:p-6">
        {isLoading ? (
          <p className="text-sm text-on-surface-variant py-4">Loading trips...</p>
        ) : trips.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-on-surface-variant py-2">
            <Calendar className="w-4 h-4" />
            No trips scheduled for {dayLabel(dayOffset).toLowerCase() === 'today' ? 'today' : dayLabel(dayOffset)}.
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => {
              const originStop = trip.route.routeStops.find((rs) => rs.stopId === route.originStopId)
              const destStop = trip.route.routeStops.find((rs) => rs.stopId === route.destinationStopId)
              const price = originStop && destStop
                ? Number(destStop.priceFromOrigin) - Number(originStop.priceFromOrigin)
                : 0

              return (
                <div
                  key={trip.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-outline-variant hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-on-surface text-sm">{tripTime(trip.departureDateTime)}</span>
                    <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Bus className="w-3.5 h-3.5" />
                      {trip.car.make} {trip.car.model}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary text-sm">{formatCurrency(price)}</span>
                    <button
                      onClick={() => navigate(`/trips/${trip.id}?from=${route.originStopId}&to=${route.destinationStopId}`)}
                      className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition-all"
                    >
                      Book
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
