import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Share2, Bus, Ticket } from 'lucide-react'
import { bookingsApi } from '@/api'
import { BookingSteps } from '@/components/shared'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, formatCurrency, getWhatsAppShareUrl } from '@/lib/utils'
import type { Booking } from '@/types'

export function ConfirmationPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking-ticket', ticketCode],
    queryFn: () => bookingsApi.findByTicketCode(ticketCode!),
    enabled: !!ticketCode,
  })

  // If this booking was part of a multi-seat purchase, load its siblings too so every
  // seat in the group shows up on the confirmation page, not just the one we landed on.
  const { data: groupBookings } = useQuery<Booking[]>({
    queryKey: ['booking-group', booking?.groupId],
    queryFn: () => bookingsApi.findByGroupId(booking!.groupId),
    enabled: !!booking?.groupId,
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading ticket...</div>
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-gray-500">Ticket not found</div>

  const bookings = groupBookings && groupBookings.length > 0 ? groupBookings : [booking]
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0)
  const from = booking.pickupStop.stop.name
  const to = booking.dropoffStop.stop.name
  const departure = formatDateTime(booking.trip.departureDateTime)
  const whatsappUrl = getWhatsAppShareUrl(booking.ticketCode, from, to, departure, booking.seatNumber)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BookingSteps current={2} />
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        {/* Success badge */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-500 mt-1">{bookings.length > 1 ? `${bookings.length} tickets have been issued` : 'Your ticket has been issued'}</p>
        </div>

        {/* Ticket — styled after our physical paper stub */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex">
          {/* Counterfoil */}
          <div
            className="w-12 flex-shrink-0 flex flex-col items-center justify-between py-4 border-r-2 border-dashed border-white/20"
            style={{ backgroundColor: '#610000' }}
          >
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain brightness-0 invert" />
            <span className="text-[#ffb4a8] text-[10px] font-mono tracking-widest" style={{ writingMode: 'vertical-rl' }}>
              {booking.ticketCode}
            </span>
          </div>

          {/* Main stub */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <img src="/logo.png" alt="MaidAutos" className="h-9 w-auto flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-extrabold text-gray-900 leading-tight tracking-tight">MAID AUTOS LIMITED</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: '#610000' }}>
                  PASSENGER TICKET
                </span>
              </div>
            </div>

            {/* Form-style fields */}
            <div className="px-5 pb-1">
              <TicketField label="Date" value={departure} />
              <TicketField label="Vehicle No" value={booking.trip.car.plateNumber} />
              <TicketField label="Destination" value={`${from} to ${to}`} />
              <TicketField label={bookings.length > 1 ? 'Total Amount' : 'Amount'} value={formatCurrency(totalAmount)} valueClassName="text-primary" />
              {bookings.length === 1 ? (
                <TicketField label="Seat" value={`${booking.seatNumber}`} valueClassName="text-primary" />
              ) : (
                <div className="py-2 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seats</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 justify-end">
                    {bookings.map((b) => (
                      <span key={b.id} className="text-xs font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                        {b.seatNumber} · {b.ticketCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tagline */}
            <div className="px-5 py-3 flex items-center justify-center gap-2 border-t border-gray-100">
              <Bus className="w-4 h-4" style={{ color: '#610000' }} />
              <span className="text-xs font-extrabold tracking-wide" style={{ color: '#610000' }}>LUGGAGE AT OWNER'S RISK</span>
              <Bus className="w-4 h-4" style={{ color: '#610000' }} />
            </div>

            {/* Payment status */}
            <div className="px-5 pb-4">
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {booking.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending — Pay to driver/agent before boarding'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-semibold text-sm shadow-lg"
          >
            <Share2 className="w-4 h-4" /> Share via WhatsApp
          </a>
        </div>

        {isAuthenticated ? (
          <Link
            to="/account/bookings"
            className="w-full flex items-center justify-center gap-2 bg-primary hover:brightness-110 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-colors"
          >
            <Ticket className="w-4 h-4" /> View My Trips
          </Link>
        ) : (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-600">Save this trip to your account so you can find it later.</p>
            <button
              onClick={() => navigate(booking.guestEmail ? `/register?email=${encodeURIComponent(booking.guestEmail)}` : '/register')}
              className="mt-1.5 text-sm font-bold text-primary hover:underline"
            >
              Create an account
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Back to home
        </button>
      </div>
      </div>
    </div>
  )
}

function TicketField({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-gray-200 py-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{label}:</span>
      <span className={`flex-1 text-right font-semibold text-gray-900 truncate ${valueClassName || ''}`}>{value}</span>
    </div>
  )
}
