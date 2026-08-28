import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bus, MapPin, ArrowRight, Wifi, UtensilsCrossed } from 'lucide-react'
import { tripsApi } from '@/api'
import type { Trip } from '@/types'
import { SeatGrid } from '@/components/ui/SeatGrid'
import { BookingSteps } from '@/components/shared'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils'

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromStopId = searchParams.get('from') || ''
  const toStopId = searchParams.get('to') || ''

  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const MAX_SEATS_PER_BOOKING = 10

  const toggleSeat = (seat: number) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat)
      if (prev.length >= MAX_SEATS_PER_BOOKING) return prev
      return [...prev, seat]
    })
  }

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.findOne(id!),
    enabled: !!id,
  })

  const pickupStop = trip?.route.routeStops.find((rs) => rs.stopId === fromStopId)
  const dropoffStop = trip?.route.routeStops.find((rs) => rs.stopId === toStopId)

  const { data: seatData } = useQuery({
    queryKey: ['available-seats', id, pickupStop?.id, dropoffStop?.id],
    queryFn: () => tripsApi.getAvailableSeats(id!, pickupStop!.id, dropoffStop!.id),
    enabled: !!id && !!pickupStop && !!dropoffStop,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading trip...</div>
  if (!trip) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Trip not found</div>

  const price = pickupStop && dropoffStop ? getSegmentFare(trip, pickupStop, dropoffStop) : 0
  const premiumSeatNumbers = trip.car.premiumSeatNumbers
  const premiumSeatSurcharge = Number(trip.car.premiumSeatSurcharge)
  const seatPrice = (seat: number) => price + (premiumSeatNumbers.includes(seat) ? premiumSeatSurcharge : 0)
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seatPrice(seat), 0)

  const handleContinue = () => {
    if (selectedSeats.length === 0) return
    navigate(`/booking/checkout?tripId=${trip.id}&seats=${selectedSeats.join(',')}&pickup=${pickupStop?.id}&dropoff=${dropoffStop?.id}&amount=${totalPrice}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-dark px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-white">Select Your Seat</span>
      </div>

      <BookingSteps current={0} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Trip summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-bold text-gray-900">{pickupStop?.stop.name || trip.route.originStop.name}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900">{dropoffStop?.stop.name || trip.route.destinationStop.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Departure</p><p className="font-semibold text-gray-900 mt-0.5">{formatDateTime(trip.departureDateTime)}</p></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Duration</p><p className="font-semibold text-gray-900 mt-0.5">{formatDuration(trip.route.estimatedDurationMinutes)}</p></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Price</p><p className="font-semibold text-primary mt-0.5">{formatCurrency(price)}</p></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <Bus className="w-4 h-4" />
            <span>{trip.car.make} {trip.car.model} · {trip.car.hasAC ? 'AC' : 'No AC'} · {trip.car.type}</span>
          </div>
          {(trip.car.hasWifi || trip.car.hasMeals) && (
            <div className="mt-2.5 flex items-center gap-3 text-xs text-primary/80 font-medium">
              {trip.car.hasWifi && <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Free Wi-Fi</span>}
              {trip.car.hasMeals && <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Free Meals</span>}
            </div>
          )}
        </div>

        {/* Seat map */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Choose your seats</h3>
            <span className="text-xs text-gray-400">Up to {MAX_SEATS_PER_BOOKING} per booking</span>
          </div>
          <SeatGrid
            carType={trip.car.type}
            capacity={trip.car.capacity}
            takenSeats={seatData?.taken || []}
            selectedSeats={selectedSeats}
            onToggleSeat={toggleSeat}
            premiumSeatNumbers={premiumSeatNumbers}
            premiumSeatSurcharge={premiumSeatSurcharge}
          />
        </div>

        {/* CTA */}
        <button
          disabled={selectedSeats.length === 0}
          onClick={handleContinue}
          className="w-full bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
        >
          {selectedSeats.length > 0
            ? `Continue — ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} · ${formatCurrency(totalPrice)}`
            : 'Select a seat to continue'}
        </button>
      </div>
    </div>
  )
}
