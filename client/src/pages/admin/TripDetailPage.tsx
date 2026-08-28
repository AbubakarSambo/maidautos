import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { ArrowLeft, Plus, Pencil, Snowflake, Wifi, UtensilsCrossed } from 'lucide-react'
import { tripsApi, carsApi, driversApi } from '@/api'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Select } from '@/components/shared'
import type { Trip, TripStatus, Car, Driver } from '@/types'

const NEXT_STATUSES: Partial<Record<TripStatus, TripStatus[]>> = {
  SCHEDULED: ['BOARDING', 'CANCELLED'],
  BOARDING: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED'],
}

// Trips that have already departed or ended shouldn't have their car/driver/time changed.
const EDITABLE_STATUSES: TripStatus[] = ['SCHEDULED', 'BOARDING']

type EditForm = {
  carId: string
  driverId: string
  departureDateTime: string
  priceOverride: string
}

export function AdminTripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [checkpoint, setCheckpoint] = useState('')
  const [checkpointNote, setCheckpointNote] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: trip } = useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.findOne(id!),
    enabled: !!id,
  })

  const { data: cars = [] } = useQuery<Car[]>({ queryKey: ['cars'], queryFn: carsApi.findAll, enabled: isEditing })
  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: driversApi.findAll, enabled: isEditing })

  const { register, control, handleSubmit, reset } = useForm<EditForm>()

  useEffect(() => {
    if (trip && isEditing) {
      reset({
        carId: trip.carId,
        driverId: trip.driverId,
        departureDateTime: trip.departureDateTime.slice(0, 16),
        priceOverride: trip.priceOverride != null ? String(trip.priceOverride) : '',
      })
    }
  }, [trip, isEditing, reset])

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation({
    mutationFn: (status: TripStatus) => tripsApi.updateStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['trip', id] }) },
  })

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    mutationFn: (data: EditForm) =>
      tripsApi.update(id!, {
        carId: data.carId,
        driverId: data.driverId,
        departureDateTime: data.departureDateTime,
        priceOverride: data.priceOverride ? Number(data.priceOverride) : null,
      }),
    onSuccess: () => {
      toast.success('Trip updated')
      qc.invalidateQueries({ queryKey: ['trip', id] })
      setIsEditing(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update trip'),
  })

  const onSubmitEdit = (data: EditForm) => {
    const selectedCar = cars.find((c) => c.id === data.carId)
    if (selectedCar && trip && selectedCar.capacity < (trip._count?.bookings ?? 0)) {
      toast.error(`This car only has ${selectedCar.capacity} seats — this trip already has ${trip._count?.bookings} booking(s)`)
      return
    }
    saveEdit(data)
  }

  const { mutate: addUpdate, isPending: addingUpdate } = useMutation({
    mutationFn: () => tripsApi.addStatusUpdate(id!, { checkpointLabel: checkpoint, note: checkpointNote || undefined }),
    onSuccess: () => { toast.success('Update posted'); setCheckpoint(''); setCheckpointNote(''); qc.invalidateQueries({ queryKey: ['trip', id] }) },
  })

  if (!trip) return <div className="flex items-center justify-center py-16 text-gray-500">Loading...</div>

  const nextStatuses = NEXT_STATUSES[trip.status] || []

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/trips')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{trip.route.originStop.name} → {trip.route.destinationStop.name}</h1>
      </div>

      {/* Trip info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trip Details</p>
          {EDITABLE_STATUSES.includes(trip.status) && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Departure date & time</label>
              <input
                {...register('departureDateTime', { required: true })}
                type="datetime-local"
                className="mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Car</label>
              <Controller
                name="carId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a car"
                    options={cars.map((c) => ({
                      value: c.id,
                      label: `${c.make} ${c.model} — ${c.plateNumber} (${c.capacity} seats${c.hasAC ? ' · AC' : ''}${c.status !== 'ACTIVE' ? ` · ${c.status}` : ''})`,
                    }))}
                    className="mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Driver</label>
              <Controller
                name="driverId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a driver"
                    options={drivers.map((d) => ({
                      value: d.id,
                      label: `${d.firstName} ${d.lastName} — ${d.phone}${d.status !== 'AVAILABLE' ? ` · ${d.status}` : ''}`,
                    }))}
                    className="mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Price override <span className="text-gray-400 font-normal normal-case">(blank = use route pricing)</span>
              </label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                <input
                  {...register('priceOverride')}
                  type="number"
                  min={0}
                  step={100}
                  className="w-full pl-7 pr-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={savingEdit} className="bg-primary hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div><p className="text-xs text-gray-400">Departure</p><p className="font-semibold">{formatDateTime(trip.departureDateTime)}</p></div>
            <div>
              <p className="text-xs text-gray-400">Vehicle</p>
              <p className="font-semibold flex items-center gap-2">
                {trip.car.make} {trip.car.model} · {trip.car.plateNumber}
                <span className="flex items-center gap-1 text-gray-400">
                  {trip.car.hasAC && <span title="AC"><Snowflake className="w-3.5 h-3.5" /></span>}
                  {trip.car.hasWifi && <span title="Wi-Fi"><Wifi className="w-3.5 h-3.5" /></span>}
                  {trip.car.hasMeals && <span title="Meals"><UtensilsCrossed className="w-3.5 h-3.5" /></span>}
                </span>
              </p>
            </div>
            <div><p className="text-xs text-gray-400">Driver</p><p className="font-semibold">{trip.driver.firstName} {trip.driver.lastName}</p></div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <span className="inline-block mt-0.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700">{trip.status}</span>
            </div>
            {trip.priceOverride != null && (
              <div><p className="text-xs text-gray-400">Price override</p><p className="font-semibold text-primary">₦{trip.priceOverride.toLocaleString()}</p></div>
            )}
          </div>
        )}
      </div>

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</p>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button
                key={s}
                disabled={updatingStatus}
                onClick={() => updateStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${s === 'CANCELLED' ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-primary text-white hover:brightness-110 shadow-lg'}`}
              >
                Mark as {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add location update */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Post Location Update</p>
        <div className="space-y-2">
          <input
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            placeholder="e.g. Arrived Kaduna"
            className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <input
            value={checkpointNote}
            onChange={(e) => setCheckpointNote(e.target.value)}
            placeholder="Optional note (e.g. 15 min stop)"
            className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            disabled={!checkpoint || addingUpdate}
            onClick={() => addUpdate()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Post Update
          </button>
        </div>
      </div>

      {/* Status updates timeline */}
      {trip.statusUpdates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location History</p>
          <div className="space-y-3">
            {trip.statusUpdates.map((u) => (
              <div key={u.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Passengers</p>
          <button onClick={() => navigate(`/admin/bookings/new?tripId=${trip.id}`)} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            <Plus className="w-3 h-3" /> Add booking
          </button>
        </div>
        <p className="text-gray-500 text-sm">{trip._count?.bookings ?? 0} bookings · {trip.car.capacity - (trip._count?.bookings ?? 0)} seats left</p>
      </div>
    </div>
  )
}
