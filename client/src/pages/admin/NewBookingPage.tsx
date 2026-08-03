import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Search, UserX } from 'lucide-react'
import { tripsApi, bookingsApi } from '@/api'
import apiClient from '@/api/client'
import { SeatGrid } from '@/components/ui/SeatGrid'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Select } from '@/components/shared'
import type { Trip } from '@/types'

type PassengerMode = 'search' | 'guest'

export function AdminNewBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedTripId = searchParams.get('tripId') || ''

  // Step state
  const [tripId, setTripId] = useState(preselectedTripId)
  const [pickupStopId, setPickupStopId] = useState('')
  const [dropoffStopId, setDropoffStopId] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK' | 'CASH'>('CASH')

  // Passenger
  const [passengerMode, setPassengerMode] = useState<PassengerMode>('guest')
  const [passengerSearch, setPassengerSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [nokName, setNokName] = useState('')
  const [nokPhone, setNokPhone] = useState('')

  // Trip search for admin (if no preselected trip)
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0])

  const { data: allTrips = [] } = useQuery<Trip[]>({
    queryKey: ['admin-trips-for-booking', tripDate],
    queryFn: () =>
      tripsApi.findAll({ date: tripDate, status: 'SCHEDULED' }).then((r) =>
        Array.isArray(r) ? r : []
      ),
    enabled: !preselectedTripId,
  })

  const { data: trip } = useQuery<Trip>({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.findOne(tripId),
    enabled: !!tripId,
  })

  const pickupStop = trip?.route.routeStops.find((rs) => rs.id === pickupStopId)
  const dropoffStop = trip?.route.routeStops.find((rs) => rs.id === dropoffStopId)

  const { data: seatData } = useQuery({
    queryKey: ['available-seats', tripId, pickupStopId, dropoffStopId],
    queryFn: () => tripsApi.getAvailableSeats(tripId, pickupStopId, dropoffStopId),
    enabled: !!tripId && !!pickupStopId && !!dropoffStopId,
  })

  // Passenger user search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['user-search', passengerSearch],
    queryFn: () =>
      apiClient
        .get('/users', { params: { role: 'PASSENGER' } })
        .then((r) =>
          (r.data.data as any[]).filter(
            (u) =>
              u.firstName?.toLowerCase().includes(passengerSearch.toLowerCase()) ||
              u.lastName?.toLowerCase().includes(passengerSearch.toLowerCase()) ||
              u.phone?.includes(passengerSearch) ||
              u.email?.toLowerCase().includes(passengerSearch.toLowerCase())
          )
        ),
    enabled: passengerMode === 'search' && passengerSearch.length >= 2,
  })

  // Reset seat when segment changes
  useEffect(() => setSelectedSeat(null), [pickupStopId, dropoffStopId])
  // Reset segment when trip changes
  useEffect(() => { setPickupStopId(''); setDropoffStopId(''); setSelectedSeat(null) }, [tripId])

  const amount =
    pickupStop && dropoffStop
      ? Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin)
      : 0

  const isReadyToBook =
    !!tripId &&
    !!pickupStopId &&
    !!dropoffStopId &&
    !!selectedSeat &&
    (passengerMode === 'search' ? !!selectedUserId : !!guestPhone || !!guestEmail)

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        tripId,
        seatNumber: selectedSeat!,
        pickupStopId,
        dropoffStopId,
        paymentMethod,
        nokName: nokName || undefined,
        nokPhone: nokPhone || undefined,
        ...(passengerMode === 'search' && selectedUserId
          ? { passengerUserId: selectedUserId }
          : { guestName: guestName || undefined, guestEmail: guestEmail || undefined, guestPhone: guestPhone || undefined }),
      }),
    onSuccess: (booking) => {
      toast.success(`Booking created — ${booking.ticketCode}`)
      navigate(`/admin/bookings`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Booking failed'),
  })

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/bookings')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">New Booking</h1>
      </div>

      {/* STEP 1 — Trip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-gray-900">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-bold mr-2">1</span>
          Trip
        </h2>

        {preselectedTripId && trip ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-sm">
            <p className="font-semibold text-primary-dark">
              {trip.route.originStop.name} → {trip.route.destinationStop.name}
            </p>
            <p className="text-primary mt-0.5">{formatDateTime(trip.departureDateTime)} · {trip.car.make} {trip.car.model}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={tripDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTripDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select trip</label>
              <Select
                value={tripId}
                onChange={setTripId}
                placeholder="Choose a trip..."
                options={allTrips.map((t) => ({
                  value: t.id,
                  label: `${t.route.originStop.name} → ${t.route.destinationStop.name} · ${formatDateTime(t.departureDateTime)}`,
                }))}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {allTrips.length === 0 && tripDate && (
                <p className="text-xs text-gray-400 mt-1">No scheduled trips on this date.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 2 — Pickup & Dropoff */}
      {trip && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-bold mr-2">2</span>
            Boarding & Alighting Stops
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pickup stop *</label>
              <Select
                value={pickupStopId}
                onChange={(v) => { setPickupStopId(v); setDropoffStopId('') }}
                placeholder="Select..."
                options={trip.route.routeStops.slice(0, -1).map((rs) => ({ value: rs.id, label: rs.stop.name }))}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dropoff stop *</label>
              <Select
                value={dropoffStopId}
                onChange={setDropoffStopId}
                disabled={!pickupStopId}
                placeholder="Select..."
                options={trip.route.routeStops
                  .filter((rs) => {
                    const pickup = trip.route.routeStops.find((r) => r.id === pickupStopId)
                    return pickup ? rs.order > pickup.order : false
                  })
                  .map((rs) => ({ value: rs.id, label: rs.stop.name }))}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
              />
            </div>
          </div>

          {amount > 0 && (
            <div className="text-sm text-primary font-semibold bg-primary/10 px-3 py-2 rounded-xl">
              Fare: {formatCurrency(amount)}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Seat */}
      {trip && pickupStopId && dropoffStopId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-bold mr-2">3</span>
            Seat Selection
          </h2>
          {seatData ? (
            <SeatGrid
              carType={trip.car.type}
              capacity={trip.car.capacity}
              takenSeats={seatData.taken}
              selectedSeat={selectedSeat}
              onSelectSeat={setSelectedSeat}
            />
          ) : (
            <p className="text-gray-400 text-sm">Loading seat map...</p>
          )}
        </div>
      )}

      {/* STEP 4 — Passenger */}
      {selectedSeat && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-bold mr-2">4</span>
            Passenger
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setPassengerMode('search'); setSelectedUserId(null); setSelectedUserName('') }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                passengerMode === 'search' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Existing passenger
            </button>
            <button
              onClick={() => { setPassengerMode('guest'); setSelectedUserId(null); setSelectedUserName('') }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                passengerMode === 'guest' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserX className="w-3.5 h-3.5" /> Walk-in / Guest
            </button>
          </div>

          {passengerMode === 'search' ? (
            <div className="space-y-3">
              {selectedUserId ? (
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {selectedUserName[0]}
                  </div>
                  <span className="font-medium text-primary-dark flex-1">{selectedUserName}</span>
                  <button
                    onClick={() => { setSelectedUserId(null); setSelectedUserName('') }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Search by name or phone</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={passengerSearch}
                      onChange={(e) => setPassengerSearch(e.target.value)}
                      placeholder="Start typing..."
                      className="w-full pl-9 pr-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {passengerSearch.length >= 2 && (
                    <div className="mt-1.5 border border-outline-variant rounded-xl overflow-hidden">
                      {searching && (
                        <p className="px-3 py-2 text-sm text-gray-400">Searching...</p>
                      )}
                      {!searching && searchResults.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">No passengers found</p>
                      )}
                      {searchResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUserId(u.id)
                            setSelectedUserName(`${u.firstName} ${u.lastName}`)
                            setPassengerSearch('')
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b last:border-b-0"
                        >
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                            {u.firstName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400">{u.phone || u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full name</label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Passenger's full name"
                  className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone *</label>
                  <input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="08012345678"
                    className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                  <input
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    type="email"
                    placeholder="For ticket delivery"
                    className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Next of kin — optional safety contact */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Next of Kin (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={nokName}
                onChange={(e) => setNokName(e.target.value)}
                placeholder="Next of kin's name"
                className="px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                value={nokPhone}
                onChange={(e) => setNokPhone(e.target.value)}
                placeholder="Next of kin's phone"
                className="px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 — Payment */}
      {isReadyToBook && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-bold mr-2">5</span>
            Payment Method
          </h2>
          <div className="flex gap-3">
            {(['CASH', 'PAYSTACK'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  paymentMethod === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'CASH' ? '💵 Cash' : '💳 Paystack'}
              </button>
            ))}
          </div>
          {paymentMethod === 'CASH' && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
              Booking will be marked as paid immediately. Collect cash before the passenger boards.
            </p>
          )}
          {paymentMethod === 'PAYSTACK' && (
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
              Booking will be confirmed but marked as pending until payment is completed via Paystack.
            </p>
          )}
        </div>
      )}

      {/* Summary + Submit */}
      {isReadyToBook && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Route</span><span className="font-medium">{pickupStop?.stop.name} → {dropoffStop?.stop.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Departure</span><span className="font-medium">{trip && formatDateTime(trip.departureDateTime)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Seat</span><span className="font-bold text-primary">{selectedSeat}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Passenger</span><span className="font-medium">{selectedUserName || guestName || guestPhone}</span></div>
            {(nokName || nokPhone) && (
              <div className="flex justify-between"><span className="text-gray-500">Next of Kin</span><span className="font-medium">{[nokName, nokPhone].filter(Boolean).join(' · ')}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{paymentMethod}</span></div>
            <div className="flex justify-between pt-2 border-t"><span className="font-semibold">Fare</span><span className="font-bold text-lg text-primary">{formatCurrency(amount)}</span></div>
          </div>

          <button
            onClick={() => createBooking()}
            disabled={isPending}
            className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg"
          >
            {isPending ? 'Creating booking...' : `Confirm Booking — ${formatCurrency(amount)}`}
          </button>
        </div>
      )}
    </div>
  )
}
