import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Calendar, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi, paystackApi, tripsApi } from '@/api'
import { SeatGrid } from '@/components/ui/SeatGrid'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDateTime, getSegmentFare } from '@/lib/utils'
import type { BookingChangeQuote, ManageBookingResult, SeatAvailability, Trip } from '@/types'

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback

function todayIso() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

// Self-service "manage booking": look a ticket up (logged-in owners by code alone, guests
// with the email/phone they booked with), then move it to another trip on the same
// pickup/dropoff stops for a fee. The change completes once the fee is paid on Paystack.
export function ManageBookingPage() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const [ticketCode, setTicketCode] = useState(searchParams.get('code') || '')
  const [contact, setContact] = useState('')
  const [result, setResult] = useState<ManageBookingResult | null>(null)

  const lookup = useMutation({
    mutationFn: (opts: { silent?: boolean }) =>
      bookingsApi.manageLookup({ ticketCode, contact: contact || undefined }).then((r) => ({ r, opts })),
    onSuccess: ({ r }) => setResult(r),
    onError: (err: any, opts) => {
      if (!opts.silent) toast.error(errorMessage(err, 'Could not find that booking'))
    },
  })

  // Logged-in owners arriving from My Trips / their ticket don't need to re-enter details.
  useEffect(() => {
    if (isAuthenticated && searchParams.get('code')) lookup.mutate({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-dark px-4 py-5">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Manage Booking</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!result ? (
          <form
            onSubmit={(e) => { e.preventDefault(); lookup.mutate({}) }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
          >
            <p className="text-sm text-gray-600">Enter your ticket code and the email or phone number you booked with.</p>
            <input
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="Ticket code (e.g. MAD-ABC123)"
              required
              className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone number"
              required={!isAuthenticated}
              className="w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={lookup.isPending}
              className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 shadow-lg"
            >
              {lookup.isPending ? 'Finding booking...' : 'Find booking'}
            </button>
          </form>
        ) : (
          <ManageBooking result={result} contact={contact || undefined} />
        )}
      </div>
    </div>
  )
}

function ManageBooking({ result, contact }: { result: ManageBookingResult; contact?: string }) {
  const { booking, change } = result
  const [date, setDate] = useState('')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [seat, setSeat] = useState<number | null>(null)

  const pickupStopId = booking.pickupStop.stopId
  const dropoffStopId = booking.dropoffStop.stopId

  const { data: search, isFetching: searching } = useQuery({
    queryKey: ['change-search', pickupStopId, dropoffStopId, date],
    queryFn: () => tripsApi.search(pickupStopId, dropoffStopId, date),
    enabled: !!date && change.allowed,
  })
  const trips = (search?.trips ?? []).filter(
    (t) => t.id !== booking.tripId && t.status === 'SCHEDULED' && new Date(t.departureDateTime) > new Date(),
  )

  // The new trip may be on a different route, so find its own route-stop rows for our stops.
  const newPickup = trip?.route.routeStops.find((rs) => rs.stopId === pickupStopId)
  const newDropoff = trip?.route.routeStops.find((rs) => rs.stopId === dropoffStopId)

  const { data: seats } = useQuery<SeatAvailability>({
    queryKey: ['seats', trip?.id, newPickup?.id, newDropoff?.id],
    queryFn: () => tripsApi.getAvailableSeats(trip!.id, newPickup!.id, newDropoff!.id),
    enabled: !!trip && !!newPickup && !!newDropoff,
  })

  const { data: quote, error: quoteError } = useQuery<BookingChangeQuote>({
    queryKey: ['change-quote', booking.ticketCode, trip?.id, seat],
    queryFn: () => bookingsApi.manageQuote({ ticketCode: booking.ticketCode, contact, tripId: trip!.id, seatNumber: seat! }),
    enabled: !!trip && seat != null,
    retry: false,
  })

  const pay = useMutation({
    mutationFn: async () => {
      const { groupId } = await bookingsApi.manageChange({ ticketCode: booking.ticketCode, contact, tripId: trip!.id, seatNumber: seat! })
      const { authorizationUrl } = await paystackApi.initialize(groupId)
      if (!authorizationUrl) throw new Error('Could not start payment')
      window.location.href = authorizationUrl
    },
    onError: (err: any) => toast.error(errorMessage(err, err?.message || 'Could not change booking')),
  })

  return (
    <>
      {/* Current booking */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-gray-900">{booking.pickupStop.stop.name}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-gray-900">{booking.dropoffStop.stop.name}</span>
          <span className="ml-auto text-xs text-gray-400 font-mono">{booking.ticketCode}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(booking.trip.departureDateTime)}</span>
          <span>Seat {booking.seatNumber}</span>
          <span className="ml-auto font-semibold text-gray-700">{formatCurrency(booking.amount)}</span>
        </div>
        <Link to={`/booking/confirmation/${booking.ticketCode}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Ticket className="w-3.5 h-3.5" /> View ticket
        </Link>
      </div>

      {!change.allowed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">{change.reason}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Change to another trip</h2>
            <p className="text-xs text-gray-500 mt-1">
              A change fee of {Math.round(change.feeRate * 100)}% of your ticket ({formatCurrency(change.fee)}) applies. If the new trip
              costs more you also pay the difference; if it costs less, the difference isn't refunded. Changes close{' '}
              {change.cutoffHours} hours before departure.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">New travel date</label>
            <input
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => { setDate(e.target.value); setTrip(null); setSeat(null) }}
              className="mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {date && (
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
                      <span className="ml-auto font-semibold text-primary">{p && d ? formatCurrency(getSegmentFare(t, p, d)) : ''}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.car.make} {t.car.model} · {t.car.type}</div>
                  </button>
                )
              })}
            </div>
          )}

          {trip && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Choose a seat</label>
              <div className="mt-3">
                <SeatGrid
                  carType={trip.car.type}
                  capacity={trip.car.capacity}
                  takenSeats={seats?.taken || []}
                  selectedSeats={seat != null ? [seat] : []}
                  onToggleSeat={(s) => setSeat(seat === s ? null : s)}
                  premiumSeatNumbers={trip.car.premiumSeatNumbers}
                  premiumSeatSurcharge={Number(trip.car.premiumSeatSurcharge)}
                />
              </div>
            </div>
          )}

          {quoteError && (
            <p className="text-sm text-red-600">{errorMessage(quoteError, 'That seat or trip is no longer available')}</p>
          )}

          {quote && (
            <div className="border-t border-dashed border-outline-variant pt-4 space-y-1.5 text-sm">
              <Row label={`Change fee (${Math.round(change.feeRate * 100)}% of ${formatCurrency(quote.currentValue)})`} value={formatCurrency(quote.changeFee)} />
              <Row label={`Fare difference (new fare ${formatCurrency(quote.newFare)})`} value={formatCurrency(quote.fareDifference)} />
              <Row label="Total to pay" value={formatCurrency(quote.totalDue)} bold />
              <button
                type="button"
                onClick={() => pay.mutate()}
                disabled={pay.isPending}
                className="w-full mt-3 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 shadow-lg"
              >
                {pay.isPending ? 'Redirecting to payment...' : `Pay ${formatCurrency(quote.totalDue)} and change booking`}
              </button>
              <p className="text-xs text-gray-500 text-center">Your current ticket stays valid until payment goes through. You'll get a new ticket code.</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold text-gray-900 pt-1' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
