import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi } from '@/api'
import { formatDateTime } from '@/lib/utils'
import type { Booking } from '@/types'

type Form = {
  guestName: string
  guestPhone: string
  guestEmail: string
  nokName: string
  nokPhone: string
  amount: string
}

const inputClass =
  'mt-1 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const labelClass = 'text-xs font-bold text-gray-500 uppercase tracking-wide'

// Hands a booked seat to a new passenger who paid cash: the original ticket is cancelled
// and a new ticket (new code) is issued for the same trip, seat and stops.
export function ReassignBookingDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const qc = useQueryClient()
  const originalName = booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || 'Guest'

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { amount: String(booking.amount) },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Form) =>
      bookingsApi.reassign(booking.id, {
        guestName: data.guestName.trim(),
        guestPhone: data.guestPhone.trim() || undefined,
        guestEmail: data.guestEmail.trim() || undefined,
        nokName: data.nokName.trim() || undefined,
        nokPhone: data.nokPhone.trim() || undefined,
        amount: data.amount === '' ? undefined : Number(data.amount),
      }),
    onSuccess: (newBooking: Booking) => {
      toast.success(`Seat ${booking.seatNumber} reassigned — new ticket ${newBooking.ticketCode}`)
      qc.invalidateQueries({ queryKey: ['admin-bookings'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['trip', booking.tripId] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to reassign booking'),
  })

  const onSubmit = (data: Form) => {
    if (!data.guestPhone.trim() && !data.guestEmail.trim()) {
      toast.error('Enter a phone number or email for the new passenger')
      return
    }
    mutate(data)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-title"
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 id="reassign-title" className="text-lg font-bold text-gray-900">Reassign seat {booking.seatNumber}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {booking.pickupStop.stop.name} → {booking.dropoffStop.stop.name} · {formatDateTime(booking.trip.departureDateTime)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
            <span className="font-semibold">{originalName}</span>'s ticket <span className="font-mono">{booking.ticketCode}</span> will be
            cancelled{booking.user?.email || booking.guestEmail ? ' and they’ll get a cancellation email' : ''}. Any refund owed to them
            is handled outside the system.
          </div>

          <div>
            <label className={labelClass}>New passenger name</label>
            <input {...register('guestName', { required: true, validate: (v) => !!v.trim() })} className={inputClass} autoFocus />
            {errors.guestName && <p className="text-xs text-red-600 mt-1">Name is required</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Phone</label>
              <input {...register('guestPhone')} type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <input {...register('guestEmail')} type="email" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Next of kin <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <input {...register('nokName')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Next of kin phone</label>
              <input {...register('nokPhone')} type="tel" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cash received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 mt-0.5 text-gray-400 text-sm">₦</span>
              <input {...register('amount', { min: 0 })} type="number" min={0} step={100} className={`${inputClass} pl-7`} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Recorded as a paid cash ticket. Defaults to the original fare.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              {isPending ? 'Reassigning…' : 'Reassign & issue ticket'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
