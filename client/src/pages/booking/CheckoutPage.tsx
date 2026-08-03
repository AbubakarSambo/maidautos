import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { bookingsApi, paystackApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { BookingSteps } from '@/components/shared'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type GuestForm = {
  guestName: string
  guestEmail: string
  guestPhone: string
  nokName: string
  nokPhone: string
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

  const { register, handleSubmit, setError, formState: { errors } } = useForm<GuestForm>()

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: (data: GuestForm) =>
      bookingsApi.create({
        tripId,
        seatNumber,
        pickupStopId,
        dropoffStopId,
        paymentMethod: 'PAYSTACK',
        nokName: data.nokName,
        nokPhone: data.nokPhone,
        ...(!isAuthenticated ? { guestName: data.guestName, guestEmail: data.guestEmail, guestPhone: data.guestPhone } : {}),
      }),
    onSuccess: async (booking) => {
      try {
        const { authorizationUrl } = await paystackApi.initialize(booking.id)
        if (authorizationUrl) {
          window.location.href = authorizationUrl
        } else {
          toast.error('Could not start payment — please try again')
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Could not start payment — please try again')
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
    if (!data.nokName || data.nokName.trim().length < 2) {
      return setError('nokName', { message: 'Next of kin name required' })
    }
    if (!data.nokPhone || data.nokPhone.trim().length < 10) {
      return setError('nokPhone', { message: 'Valid next of kin phone required' })
    }
    createBooking(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-dark px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-white">Checkout</span>
      </div>

      <BookingSteps current={1} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Summary</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Seat {seatNumber}</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(amount)}</span>
          </div>
        </div>

        {/* Guest details if not logged in */}
        {!isAuthenticated && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Passenger Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full name *</label>
                <input {...register('guestName')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Enter your full name" />
                {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone *</label>
                <input {...register('guestPhone')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="08012345678" />
                {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email (for ticket delivery)</label>
                <input {...register('guestEmail')} type="email" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="you@example.com" />
                {errors.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.guestEmail.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Next of kin — safety contact, collected for every passenger */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Next of Kin</p>
          <p className="text-xs text-gray-400 mb-3">A contact we can reach in case of an emergency during your trip.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full name *</label>
              <input {...register('nokName')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Next of kin's full name" />
              {errors.nokName && <p className="text-red-500 text-xs mt-1">{errors.nokName.message}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone *</label>
              <input {...register('nokPhone')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="08012345678" />
              {errors.nokPhone && <p className="text-red-500 text-xs mt-1">{errors.nokPhone.message}</p>}
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Method</p>
          <div className="flex items-center gap-2 p-3 border-2 border-primary bg-primary/10 text-primary rounded-xl text-sm font-semibold">
            <CreditCard className="w-4 h-4" /> Pay Online (Card / Bank Transfer)
          </div>
          <p className="text-xs text-gray-400 mt-2">Cash payments are only handled in person by a MaidAutos agent at the terminal.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            {isPending ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
          </button>
        </form>

        {!isAuthenticated && (
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-primary font-semibold hover:underline">Sign in</button>
          </p>
        )}
      </div>
    </div>
  )
}
