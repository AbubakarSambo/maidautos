import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Banknote } from 'lucide-react'
import { bookingsApi, paystackApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type GuestForm = {
  guestName: string
  guestEmail: string
  guestPhone: string
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const tripId = searchParams.get('tripId') || ''
  const seatNumber = Number(searchParams.get('seat'))
  const pickupStopId = searchParams.get('pickup') || ''
  const dropoffStopId = searchParams.get('dropoff') || ''
  const amount = Number(searchParams.get('amount'))

  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK' | 'CASH'>('PAYSTACK')

  const { register, handleSubmit, setError, formState: { errors } } = useForm<GuestForm>()

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: (guestData?: GuestForm) =>
      bookingsApi.create({
        tripId,
        seatNumber,
        pickupStopId,
        dropoffStopId,
        paymentMethod,
        ...(!isAuthenticated && guestData ? guestData : {}),
      }),
    onSuccess: async (booking) => {
      if (paymentMethod === 'PAYSTACK') {
        try {
          const { authorizationUrl } = await paystackApi.initialize(booking.id)
          if (authorizationUrl) {
            window.location.href = authorizationUrl
          } else {
            toast.error('Could not start payment — please try again or pay cash')
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Could not start payment — please try again or pay cash')
        }
      } else {
        navigate(`/booking/confirmation/${booking.ticketCode}`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Booking failed')
    },
  })

  const onSubmit = (data: GuestForm) => {
    if (!isAuthenticated) {
      if (!data.guestName || data.guestName.trim().length < 2) {
        return setError('guestName', { message: 'Full name required' })
      }
      if (!data.guestPhone || data.guestPhone.trim().length < 10) {
        return setError('guestPhone', { message: 'Valid phone required' })
      }
      if (data.guestEmail && !/^\S+@\S+\.\S+$/.test(data.guestEmail)) {
        return setError('guestEmail', { message: 'Valid email required' })
      }
    }
    createBooking(isAuthenticated ? undefined : data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-900">Checkout</span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order summary */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Seat {seatNumber}</span>
            <span className="font-bold text-lg text-green-600">{formatCurrency(amount)}</span>
          </div>
        </div>

        {/* Guest details if not logged in */}
        {!isAuthenticated && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Passenger Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Full name *</label>
                <input {...register('guestName')} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter your full name" />
                {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone *</label>
                <input {...register('guestPhone')} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="08012345678" />
                {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email (for ticket delivery)</label>
                <input {...register('guestEmail')} type="email" className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
                {errors.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.guestEmail.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Payment method */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('PAYSTACK')}
              className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-colors ${paymentMethod === 'PAYSTACK' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
            >
              <CreditCard className="w-4 h-4" /> Pay Online
            </button>
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-colors ${paymentMethod === 'CASH' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
            >
              <Banknote className="w-4 h-4" /> Cash
            </button>
          </div>
          {paymentMethod === 'CASH' && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">Pay cash to the driver or booking agent before boarding.</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            {isPending ? 'Processing...' : paymentMethod === 'PAYSTACK' ? `Pay ${formatCurrency(amount)}` : `Confirm Booking`}
          </button>
        </form>

        {!isAuthenticated && (
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-green-600 font-medium hover:underline">Sign in</button>
          </p>
        )}
      </div>
    </div>
  )
}
