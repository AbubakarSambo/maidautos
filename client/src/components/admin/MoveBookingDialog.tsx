import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi, stopsApi, tripsApi } from '@/api'
import { Select } from '@/components/shared/Select'
import { SeatGrid } from '@/components/ui/SeatGrid'
import { formatCurrency, formatDateTime, getSegmentFare } from '@/lib/utils'
import type { Booking, SeatAvailability, Stop, Trip } from '@/types'

const labelClass = 'text-xs font-bold text-gray-500 uppercase tracking-wide'

function todayIso() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

// Admin-only: move a paid booking to another trip, optionally changing the pickup/dropoff
// (a route change). Unlike the customer's Manage Booking, there's no cutoff (works after
// departure) and no fee — the new ticket keeps what was paid. The old ticket is marked changed.
export function MoveBookingDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(todayIso())
  const [trip, setTrip] = useState<Trip | null>(null)
  const [seat, setSeat] = useState<number | null>(null)

  const [pickupStopId, setPickupStopId] = useState(booking.pickupStop.stopId)
  const [dropoffStopId, setDropoffStopId] = useState(booking.dropoffStop.stopId)
  const stopsChanged = pickupStopId !== booking.pickupStop.stopId || dropoffStopId !== booking.dropoffStop.stopId

  const { data: fromStops = [] } = useQuery<Stop[]>({ queryKey: ['stops', 'active'], queryFn: stopsApi.findActive })
  const { data: toStops = [] } = useQuery<Stop[]>({
    queryKey: ['stops', 'destinations', pickupStopId],
    queryFn: () => stopsApi.findDestinationsFrom(pickupStopId),
    enabled: !!pickupStopId,
  })
  const stopOptions = (stops: Stop[], current: { stopId: string; stop: { name: string } }) => {
    const options = stops.map((s) => ({ value: s.id, label: `${s.name}, ${s.state}` }))
    // Keep the booking's current stop selectable even if it's no longer listed as active.
    if (!stops.some((s) => s.id === current.stopId)) options.unshift({ value: current.stopId, label: current.stop.name })
    return options
  }
  const resetTrip = () => { setTrip(null); setSeat(null) }

  const passengerName = booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || 'Guest'

  const { data: search, isFetching: searching } = useQuery({
    queryKey: ['change-search', pickupStopId, dropoffStopId, date],
    queryFn: () => tripsApi.search(pickupStopId, dropoffStopId, date),
    enabled: !!date && !!pickupStopId && !!dropoffStopId,
  })
  // The current trip is a valid target only when the stops change (e.g. new dropoff, same car).
  const trips = (search?.trips ?? []).filter(
    (t) => (stopsChanged || t.id !== booking.tripId) && t.status === 'SCHEDULED' && new Date(t.departureDateTime) > new Date(),
  )

  // The new trip may be on a different route, so find its own route-stop rows for our stops.
  const newPickup = trip?.route.routeStops.find((rs) => rs.stopId === pickupStopId)
  const newDropoff = trip?.route.routeStops.find((rs) => rs.stopId === dropoffStopId)
  const newFare = trip && newPickup && newDropoff
    ? getSegmentFare(trip, newPickup, newDropoff) +
      (seat != null && trip.car.premiumSeatNumbers.includes(seat) ? Number(trip.car.premiumSeatSurcharge) : 0)
    : null
  const fareDiff = newFare != null ? newFare - Number(booking.amount) : 0

  const { data: seats } = useQuery<SeatAvailability>({
    queryKey: ['seats', trip?.id, newPickup?.id, newDropoff?.id],
    queryFn: () => tripsApi.getAvailableSeats(trip!.id, newPickup!.id, newDropoff!.id),
    enabled: !!trip && !!newPickup && !!newDropoff,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      bookingsApi.move(booking.id, {
        tripId: trip!.id,
        seatNumber: seat!,
        ...(stopsChanged && { pickupStopId, dropoffStopId }),
      }),
    onSuccess: (newBooking: Booking) => {
      toast.success(`Moved to ${formatDateTime(trip!.departureDateTime)}, seat ${seat} — new ticket ${newBooking.ticketCode}`)
      qc.invalidateQueries({ queryKey: ['admin-bookings'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['trip', booking.tripId] })
      qc.invalidateQueries({ queryKey: ['trip', trip!.id] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to move booking'),
  })

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-title"
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 id="move-title" className="text-lg font-bold text-gray-900">Move {booking.ticketCode}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {passengerName} · {booking.pickupStop.stop.name} → {booking.dropoffStop.stop.name} · was{' '}
              {formatDateTime(booking.trip.departureDateTime)}, seat {booking.seatNumber}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
            No fee is charged — the new ticket keeps the {formatCurrency(booking.amount)} already paid. The old ticket stops being
            valid and the passenger gets a new ticket code{booking.user?.email || booking.guestEmail ? ' by email' : ''}.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>From</label>
              <Select
                value={pickupStopId}
                onChange={(v) => { setPickupStopId(v); setDropoffStopId(''); resetTrip() }}
                options={stopOptions(fromStops, booking.pickupStop)}
                className="mt-1"
              />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <Select
                value={dropoffStopId}
                onChange={(v) => { setDropoffStopId(v); resetTrip() }}
                options={dropoffStopId === booking.dropoffStop.stopId ? stopOptions(toStops, booking.dropoffStop) : toStops.map((s) => ({ value: s.id, label: `${s.name}, ${s.state}` }))}
                placeholder="Choose dropoff"
                disabled={!pickupStopId}
                className="mt-1"
              />
            </div>
          </div>
          {stopsChanged && (
            <button
              type="button"
              onClick={() => { setPickupStopId(booking.pickupStop.stopId); setDropoffStopId(booking.dropoffStop.stopId); resetTrip() }}
              className="-mt-2 text-xs text-primary underline"
            >
              Keep original journey
            </button>
          )}

          <div>
            <label className={labelClass}>New travel date</label>
            <input
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => { setDate(e.target.value); resetTrip() }}
              className="mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {date && pickupStopId && dropoffStopId && (
            <div className="space-y-2">
              {searching && <p className="text-sm text-gray-500">Finding trips...</p>}
              {!searching && search?.isFallback && trips.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">No trips on that date — showing the next available day.</p>
              )}
              {!searching && trips.length === 0 && <p className="text-sm text-gray-500">No other trips available for this journey.</p>}
              {trips.map((t) => {
                const p = t.route.routeStops.find((rs) => rs.stopId === pickupStopId)
                const d = t.route.routeStops.find((rs) => rs.stopId === dropoffStopId)
                const selected = trip?.id === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTrip(t); setSeat(null) }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{formatDateTime(t.departureDateTime)}</span>
                      {t.id === booking.tripId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">CURRENT TRIP</span>}
                      <span className="ml-auto text-xs text-gray-500">{p && d ? formatCurrency(getSegmentFare(t, p, d)) : ''}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.car.make} {t.car.model} · {t.car.type}</div>
                  </button>
                )
              })}
            </div>
          )}

          {trip && (
            <div>
              <label className={labelClass}>Choose a seat</label>
              <div className="mt-3">
                <SeatGrid
                  carType={trip.car.type}
                  capacity={trip.car.capacity}
                  // On the current trip, the passenger's own seat is theirs to keep (the server re-checks overlaps).
                  takenSeats={(seats?.taken || []).filter((n) => !(trip.id === booking.tripId && n === booking.seatNumber))}
                  selectedSeats={seat != null ? [seat] : []}
                  onToggleSeat={(s) => setSeat(seat === s ? null : s)}
                  premiumSeatNumbers={trip.car.premiumSeatNumbers}
                  premiumSeatSurcharge={Number(trip.car.premiumSeatSurcharge)}
                />
              </div>
            </div>
          )}

          {stopsChanged && newFare != null && fareDiff !== 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
              The fare for this journey is {formatCurrency(newFare)}, {fareDiff > 0 ? `${formatCurrency(fareDiff)} more` : `${formatCurrency(-fareDiff)} less`} than
              the {formatCurrency(booking.amount)} paid. The new ticket still records {formatCurrency(booking.amount)} — settle any
              difference with the passenger separately.
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => mutate()}
              disabled={!trip || seat == null || isPending}
              className="flex-1 bg-primary hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              {isPending ? 'Moving…' : seat != null ? `Move to seat ${seat} & issue ticket` : 'Pick a trip and seat'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
