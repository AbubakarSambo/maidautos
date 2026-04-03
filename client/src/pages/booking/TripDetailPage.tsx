import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bus, MapPin, ArrowRight } from 'lucide-react'
import { tripsApi } from '@/api'
import { SeatGrid } from '@/components/ui/SeatGrid'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils'

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromStopId = searchParams.get('from') || ''
  const toStopId = searchParams.get('to') || ''

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)

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

  const price = pickupStop && dropoffStop
    ? Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin)
    : 0

  const handleContinue = () => {
    if (!selectedSeat) return
    navigate(`/booking/checkout?tripId=${trip.id}&seat=${selectedSeat}&pickup=${pickupStop?.id}&dropoff=${dropoffStop?.id}&amount=${price}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-900">Select Your Seat</span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Trip summary */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="font-semibold">{pickupStop?.stop.name || trip.route.originStop.name}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{dropoffStop?.stop.name || trip.route.destinationStop.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
            <div><p className="text-xs text-gray-400">Departure</p><p className="font-medium">{formatDateTime(trip.departureDateTime)}</p></div>
            <div><p className="text-xs text-gray-400">Duration</p><p className="font-medium">{formatDuration(trip.route.estimatedDurationMinutes)}</p></div>
            <div><p className="text-xs text-gray-400">Price</p><p className="font-medium text-green-600">{formatCurrency(price)}</p></div>
          </div>
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-gray-500">
            <Bus className="w-4 h-4" />
            <span>{trip.car.make} {trip.car.model} · {trip.car.hasAC ? 'AC' : 'No AC'} · {trip.car.type}</span>
          </div>
        </div>

        {/* Seat map */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Choose a seat</h3>
          <SeatGrid
            carType={trip.car.type}
            capacity={trip.car.capacity}
            takenSeats={seatData?.taken || []}
            selectedSeat={selectedSeat}
            onSelectSeat={setSelectedSeat}
          />
        </div>

        {/* CTA */}
        <button
          disabled={!selectedSeat}
          onClick={handleContinue}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-colors"
        >
          {selectedSeat ? `Continue — Seat ${selectedSeat} · ${formatCurrency(price)}` : 'Select a seat to continue'}
        </button>
      </div>
    </div>
  )
}
