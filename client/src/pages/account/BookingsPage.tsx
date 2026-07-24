import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bus, ArrowRight, Calendar } from 'lucide-react'
import { bookingsApi } from '@/api'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { Booking } from '@/types'

export function MyBookingsPage() {
  const navigate = useNavigate()
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: bookingsApi.findMine,
  })

  const upcoming = bookings.filter((b) => new Date(b.trip.departureDateTime) >= new Date() && b.status !== 'CANCELLED')
  const past = bookings.filter((b) => new Date(b.trip.departureDateTime) < new Date() || b.status === 'CANCELLED')

  if (isLoading) return <div className="flex items-center justify-center py-16 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-slate-900 px-4 py-5">
        <h1 className="max-w-lg mx-auto text-xl font-bold text-white">My Trips</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} onClick={() => navigate(`/booking/confirmation/${b.ticketCode}`)} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Past</h2>
            <div className="space-y-3">
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} onClick={() => navigate(`/booking/confirmation/${b.ticketCode}`)} faded />
              ))}
            </div>
          </section>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-16">
            <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No trips yet</p>
            <button onClick={() => navigate('/')} className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-900/20">Book a ride</button>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking, onClick, faded }: { booking: Booking; onClick: () => void; faded?: boolean }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-green-300 hover:shadow-md transition-all ${faded ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-900">{booking.pickupStop.stop.name}</span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span className="font-bold text-gray-900">{booking.dropoffStop.stop.name}</span>
        <span className="ml-auto text-xs text-gray-400 font-mono">{booking.ticketCode}</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(booking.trip.departureDateTime)}</span>
        <span className="ml-auto font-semibold text-gray-700">{formatCurrency(booking.amount)}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : booking.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
          {booking.status}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${booking.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
          {booking.paymentStatus}
        </span>
      </div>
    </div>
  )
}
