import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowRight, CheckCircle, Printer, RefreshCw, UserRoundPen, AlertTriangle } from 'lucide-react'
import { bookingsApi } from '@/api'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { ReassignBookingDialog } from '@/components/admin/ReassignBookingDialog'
import type { Booking, BookingStatus } from '@/types'

// Bookings that no longer hold a seat (or never travelled) get a badge so they can't be
// mistaken for live tickets in the list.
const STATUS_BADGES: Partial<Record<BookingStatus, { label: string; className: string }>> = {
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  CHANGED: { label: 'Changed', className: 'bg-gray-100 text-gray-600' },
  NO_SHOW: { label: 'No-show', className: 'bg-gray-100 text-gray-600' },
}

export function AdminBookingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [unpaidCashOnly, setUnpaidCashOnly] = useState(false)
  const [paidNoSeatOnly, setPaidNoSeatOnly] = useState(false)
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'PAYSTACK' | 'CASH'>('ALL')
  const [reassigning, setReassigning] = useState<Booking | null>(null)

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings'],
    queryFn: () => bookingsApi.findAll(),
  })

  const { mutate: recordPayment } = useMutation({
    mutationFn: (id: string) => bookingsApi.recordCashPayment(id),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }) },
  })

  const { mutate: resolvePaidWithoutSeat, isPending: isResolving } = useMutation({
    mutationFn: (id: string) => bookingsApi.resolvePaidWithoutSeat(id),
    onSuccess: () => { toast.success('Marked as resolved'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not mark as resolved'),
  })

  const { mutate: reVerifyPayment, isPending: isReVerifying } = useMutation({
    mutationFn: (id: string) => bookingsApi.reVerifyPayment(id),
    onSuccess: (data: any) => {
      if (data?.status === 'success') toast.success('Payment confirmed and booking marked paid')
      else toast.info(`Paystack reports this payment as "${data?.status ?? 'unknown'}" — still not paid`)
      qc.invalidateQueries({ queryKey: ['admin-bookings'] })
    },
    onError: () => toast.error('Could not re-verify payment'),
  })

  const unpaidCashCount = bookings.filter((b) => b.paymentMethod === 'CASH' && b.paymentStatus === 'PENDING').length
  const paidNoSeatCount = bookings.filter((b) => b.paidWithoutSeatAt).length

  const filtered = bookings.filter((b) => {
    if (unpaidCashOnly && !(b.paymentMethod === 'CASH' && b.paymentStatus === 'PENDING')) return false
    if (paidNoSeatOnly && !b.paidWithoutSeatAt) return false
    if (methodFilter !== 'ALL' && b.paymentMethod !== methodFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.ticketCode.toLowerCase().includes(q) ||
      b.guestName?.toLowerCase().includes(q) ||
      b.user?.firstName?.toLowerCase().includes(q) ||
      b.user?.lastName?.toLowerCase().includes(q) ||
      b.guestPhone?.includes(q) ||
      b.user?.phone?.includes(q) ||
      b.guestEmail?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q)
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
        <div className="flex rounded-xl border-2 border-outline-variant overflow-hidden">
          {(['ALL', 'PAYSTACK', 'CASH'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                methodFilter === m ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'ALL' ? 'All' : m === 'PAYSTACK' ? 'Paystack' : 'Cash'}
            </button>
          ))}
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
        <button
          onClick={() => setPaidNoSeatOnly((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors whitespace-nowrap ${
            paidNoSeatOnly
              ? 'border-red-500 bg-red-50 text-red-700'
              : paidNoSeatCount > 0
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-outline-variant text-gray-600 hover:bg-gray-50'
          }`}
        >
          Paid, no seat
          {paidNoSeatCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-red-500 text-white">{paidNoSeatCount}</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const passengerName = b.user ? `${b.user.firstName} ${b.user.lastName}` : b.guestName || 'Guest'
            const passengerEmail = b.user?.email || b.guestEmail
            const passengerPhone = b.user?.phone || b.guestPhone
            const statusBadge = STATUS_BADGES[b.status]
            const canReassign = b.status === 'CONFIRMED' && ['SCHEDULED', 'BOARDING'].includes(b.trip.status)
            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 ${
                  b.paidWithoutSeatAt ? 'border-red-300' : statusBadge ? 'border-gray-100 opacity-70' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{passengerName}</span>
                      <span className="text-xs text-gray-400 font-mono">{b.ticketCode}</span>
                      {statusBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge.className}`}>{statusBadge.label}</span>
                      )}
                    </div>
                    {b.paidWithoutSeatAt && (
                      <p className="flex items-start gap-1.5 text-xs text-red-700 font-semibold mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                        Paid, but no seat was free when the payment arrived. Call them to rebook on another trip or refund via Paystack.
                      </p>
                    )}
                    {b.reassignedTo && b.reassignedTo.length > 0 && (
                      <p className="text-xs text-gray-500 mb-1">
                        Seat reassigned to <span className="font-mono">{b.reassignedTo.map((r) => r.ticketCode).join(', ')}</span>
                      </p>
                    )}
                    {b.reassignedFrom && (
                      <p className="text-xs text-gray-500 mb-1">
                        Reassigned from <span className="font-mono">{b.reassignedFrom.ticketCode}</span>
                      </p>
                    )}
                    {(passengerEmail || passengerPhone) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        {passengerEmail && <span>{passengerEmail}</span>}
                        {passengerEmail && passengerPhone && <span>·</span>}
                        {passengerPhone && <span>{passengerPhone}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                      <span>{b.pickupStop.stop.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{b.dropoffStop.stop.name}</span>
                      <span className="text-gray-400">· Seat {b.seatNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>Departure {formatDateTime(b.trip.departureDateTime)}</span>
                      <span>·</span>
                      <span>{formatCurrency(b.amount)}</span>
                      <span>·</span>
                      <span>{b.paymentMethod}</span>
                      <span>·</span>
                      <span>Purchased {formatDateTime(b.createdAt)}</span>
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
                    {b.paymentStatus === 'PENDING' && b.paymentMethod === 'PAYSTACK' && b.paystackReference && (
                      <button
                        disabled={isReVerifying}
                        onClick={(e) => { e.stopPropagation(); reVerifyPayment(b.id) }}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-verify
                      </button>
                    )}
                    {b.paidWithoutSeatAt && (
                      <button
                        disabled={isResolving}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Mark ${b.ticketCode} as resolved? Only do this once the customer has been rebooked or refunded.`)) {
                            resolvePaidWithoutSeat(b.id)
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-red-700 font-semibold hover:underline disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark resolved
                      </button>
                    )}
                    {canReassign && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReassigning(b) }}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        <UserRoundPen className="w-3.5 h-3.5" /> Reassign
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(`/booking/confirmation/${b.ticketCode}?print=1`, '_blank') }}
                      className="flex items-center gap-1 text-xs text-gray-500 font-semibold hover:underline"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No bookings found</div>}
        </div>
      )}

      {reassigning && <ReassignBookingDialog booking={reassigning} onClose={() => setReassigning(null)} />}
    </div>
  )
}
