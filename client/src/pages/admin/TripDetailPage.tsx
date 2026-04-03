import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Bus, MapPin, Clock } from 'lucide-react'
import { tripsApi } from '@/api'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Trip, TripStatus } from '@/types'

const NEXT_STATUSES: Partial<Record<TripStatus, TripStatus[]>> = {
  SCHEDULED: ['BOARDING', 'CANCELLED'],
  BOARDING: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED'],
}

export function AdminTripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [checkpoint, setCheckpoint] = useState('')
  const [checkpointNote, setCheckpointNote] = useState('')

  const { data: trip } = useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.findOne(id!),
    enabled: !!id,
  })

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation({
    mutationFn: (status: TripStatus) => tripsApi.updateStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['trip', id] }) },
  })

  const { mutate: addUpdate, isPending: addingUpdate } = useMutation({
    mutationFn: () => tripsApi.addStatusUpdate(id!, { checkpointLabel: checkpoint, note: checkpointNote || undefined }),
    onSuccess: () => { toast.success('Update posted'); setCheckpoint(''); setCheckpointNote(''); qc.invalidateQueries({ queryKey: ['trip', id] }) },
  })

  if (!trip) return <div className="flex items-center justify-center py-16 text-gray-500">Loading...</div>

  const nextStatuses = NEXT_STATUSES[trip.status] || []

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/trips')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{trip.route.originStop.name} → {trip.route.destinationStop.name}</h1>
      </div>

      {/* Trip info */}
      <div className="bg-white rounded-xl border p-4 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-gray-400">Departure</p><p className="font-semibold">{formatDateTime(trip.departureDateTime)}</p></div>
        <div><p className="text-xs text-gray-400">Vehicle</p><p className="font-semibold">{trip.car.make} {trip.car.model} · {trip.car.plateNumber}</p></div>
        <div><p className="text-xs text-gray-400">Driver</p><p className="font-semibold">{trip.driver.firstName} {trip.driver.lastName}</p></div>
        <div><p className="text-xs text-gray-400">Status</p><p className="font-semibold">{trip.status}</p></div>
      </div>

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</p>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button
                key={s}
                disabled={updatingStatus}
                onClick={() => updateStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${s === 'CANCELLED' ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                Mark as {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add location update */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Post Location Update</p>
        <div className="space-y-2">
          <input
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            placeholder="e.g. Arrived Kaduna"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            value={checkpointNote}
            onChange={(e) => setCheckpointNote(e.target.value)}
            placeholder="Optional note (e.g. 15 min stop)"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            disabled={!checkpoint || addingUpdate}
            onClick={() => addUpdate()}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Post Update
          </button>
        </div>
      </div>

      {/* Status updates timeline */}
      {trip.statusUpdates.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location History</p>
          <div className="space-y-3">
            {trip.statusUpdates.map((u) => (
              <div key={u.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.checkpointLabel}</p>
                  {u.note && <p className="text-xs text-gray-500">{u.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(u.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Passengers</p>
          <button onClick={() => navigate(`/admin/bookings/new?tripId=${trip.id}`)} className="flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline">
            <Plus className="w-3 h-3" /> Add booking
          </button>
        </div>
        <p className="text-gray-500 text-sm">{trip._count?.bookings ?? 0} bookings · {trip.car.capacity - (trip._count?.bookings ?? 0)} seats left</p>
      </div>
    </div>
  )
}
