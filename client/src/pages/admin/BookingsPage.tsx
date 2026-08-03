import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowRight, CheckCircle } from 'lucide-react'
import { bookingsApi } from '@/api'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Booking } from '@/types'

export function AdminBookingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [unpaidCashOnly, setUnpaidCashOnly] = useState(false)

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings'],
    queryFn: () => bookingsApi.findAll(),
  })

  const { mutate: recordPayment } = useMutation({
    mutationFn: (id: string) => bookingsApi.recordCashPayment(id),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }) },
  })

  const unpaidCashCount = bookings.filter((b) => b.paymentMethod === 'CASH' && b.paymentStatus === 'PENDING').length

  const filtered = bookings.filter((b) => {
    if (unpaidCashOnly && !(b.paymentMethod === 'CASH' && b.paymentStatus === 'PENDING')) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.ticketCode.toLowerCase().includes(q) ||
      b.guestName?.toLowerCase().includes(q) ||
      b.user?.firstName?.toLowerCase().includes(q) ||
      b.user?.lastName?.toLowerCase().includes(q) ||
      b.guestPhone?.includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bookings</h1>
        <button onClick={() => navigate('/admin/bookings/new')} className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-colors">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or ticket code..."
            className="w-full pl-9 pr-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setUnpaidCashOnly((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors whitespace-nowrap ${
            unpaidCashOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-outline-variant text-gray-600 hover:bg-gray-50'
          }`}
        >
          Unpaid Cash
          {unpaidCashCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${unpaidCashOnly ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {unpaidCashCount}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const passengerName = b.user ? `${b.user.firstName} ${b.user.lastName}` : b.guestName || 'Guest'
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{passengerName}</span>
                      <span className="text-xs text-gray-400 font-mono">{b.ticketCode}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                      <span>{b.pickupStop.stop.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{b.dropoffStop.stop.name}</span>
                      <span className="text-gray-400">· Seat {b.seatNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDateTime(b.trip.departureDateTime)}</span>
                      <span>·</span>
                      <span>{formatCurrency(b.amount)}</span>
                      <span>·</span>
                      <span>{b.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${b.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {b.paymentStatus}
                    </span>
                    {b.paymentStatus === 'PENDING' && b.paymentMethod === 'CASH' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); recordPayment(b.id) }}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No bookings found</div>}
        </div>
      )}
    </div>
  )
}
