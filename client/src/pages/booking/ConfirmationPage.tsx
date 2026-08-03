import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Share2, ArrowRight, Bus } from 'lucide-react'
import { bookingsApi } from '@/api'
import { formatDateTime, formatCurrency, getWhatsAppShareUrl } from '@/lib/utils'
import type { Booking } from '@/types'

export function ConfirmationPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>()
  const navigate = useNavigate()

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking-ticket', ticketCode],
    queryFn: () => bookingsApi.findByTicketCode(ticketCode!),
    enabled: !!ticketCode,
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading ticket...</div>
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-gray-500">Ticket not found</div>

  const from = booking.pickupStop.stop.name
  const to = booking.dropoffStop.stop.name
  const departure = formatDateTime(booking.trip.departureDateTime)
  const whatsappUrl = getWhatsAppShareUrl(booking.ticketCode, from, to, departure, booking.seatNumber)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        {/* Success badge */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-500 mt-1">Your ticket has been issued</p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header strip */}
          <div className="px-5 py-4" style={{ backgroundColor: '#610000' }}>
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-[#ffb4a8]" />
                <span className="font-bold text-lg">MaidAutos</span>
              </div>
              <span className="text-[#ffb4a8] text-sm font-mono">{booking.ticketCode}</span>
            </div>
          </div>

          {/* Route */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400">From</p>
                <p className="font-bold text-xl text-gray-900">{from}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400">To</p>
                <p className="font-bold text-xl text-gray-900">{to}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Departure</p>
              <p className="font-semibold text-gray-900 text-sm">{departure}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Seat</p>
              <p className="font-bold text-2xl text-primary">{booking.seatNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Vehicle</p>
              <p className="font-semibold text-gray-900 text-sm">{booking.trip.car.make} {booking.trip.car.model}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="font-semibold text-gray-900 text-sm">{formatCurrency(booking.amount)}</p>
            </div>
          </div>

          {/* Payment status */}
          <div className="px-5 py-3">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {booking.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending — Pay to driver/agent before boarding'}
            </span>
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

        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
