import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { bookingsApi, paystackApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { BookingSteps } from '@/components/shared'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type PassengerForm = {
  seatNumber: number
  guestName: string
  guestEmail: string
  guestPhone: string
  nokName: string
  nokPhone: string
}

type CheckoutForm = {
  passengers: PassengerForm[]
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const tripId = searchParams.get('tripId') || ''
  const seatNumbers = (searchParams.get('seats') || '').split(',').filter(Boolean).map(Number)
  const pickupStopId = searchParams.get('pickup') || ''
  const dropoffStopId = searchParams.get('dropoff') || ''
  const amount = Number(searchParams.get('amount'))

  const { register, control, handleSubmit, setError, setValue, formState: { errors } } = useForm<CheckoutForm>({
    defaultValues: {
      passengers: seatNumbers.map((seatNumber) => ({ seatNumber, guestName: '', guestEmail: '', guestPhone: '', nokName: '', nokPhone: '' })),
    },
  })
  const { fields } = useFieldArray({ control, name: 'passengers' })

  // Lets seats after the first reuse seat 1's next-of-kin instead of retyping it — common
  // when a group travelling together shares one emergency contact.
  const [reuseFirstNok, setReuseFirstNok] = useState<boolean[]>(() => fields.map(() => false))
  const firstNokName = useWatch({ control, name: 'passengers.0.nokName' })
  const firstNokPhone = useWatch({ control, name: 'passengers.0.nokPhone' })

  const toggleReuseNok = (i: number, checked: boolean) => {
    setReuseFirstNok((prev) => prev.map((v, idx) => (idx === i ? checked : v)))
  }

  // Keep any "reuse seat 1" passengers' NOK fields in sync as seat 1's NOK is edited.
  useEffect(() => {
    reuseFirstNok.forEach((reused, i) => {
      if (!reused) return
      setValue(`passengers.${i}.nokName`, firstNokName || '')
      setValue(`passengers.${i}.nokPhone`, firstNokPhone || '')
    })
  }, [firstNokName, firstNokPhone, reuseFirstNok, setValue])

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: (data: CheckoutForm) =>
      bookingsApi.create({
        tripId,
        pickupStopId,
        dropoffStopId,
        paymentMethod: 'PAYSTACK',
        passengers: data.passengers.map((p) => ({
          seatNumber: p.seatNumber,
          nokName: p.nokName,
          nokPhone: p.nokPhone,
          ...(!isAuthenticated || p.guestName || p.guestEmail || p.guestPhone
            ? { guestName: p.guestName || undefined, guestEmail: p.guestEmail || undefined, guestPhone: p.guestPhone || undefined }
            : {}),
        })),
      }),
    onSuccess: async ({ groupId }) => {
      try {
        const { authorizationUrl } = await paystackApi.initialize(groupId)
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

  const onSubmit = (data: CheckoutForm) => {
    let hasError = false
    data.passengers.forEach((p, i) => {
      if (!isAuthenticated) {
        if (!p.guestName || p.guestName.trim().length < 2) {
          setError(`passengers.${i}.guestName`, { message: 'Full name required' })
          hasError = true
        }
        if (!p.guestPhone || p.guestPhone.trim().length < 10) {
          setError(`passengers.${i}.guestPhone`, { message: 'Valid phone required' })
          hasError = true
        }
      }
      if (p.guestEmail && !/^\S+@\S+\.\S+$/.test(p.guestEmail)) {
        setError(`passengers.${i}.guestEmail`, { message: 'Valid email required' })
        hasError = true
      }
      if (!p.nokName || p.nokName.trim().length < 2) {
        setError(`passengers.${i}.nokName`, { message: 'Next of kin name required' })
        hasError = true
      }
      if (!p.nokPhone || p.nokPhone.trim().length < 10) {
        setError(`passengers.${i}.nokPhone`, { message: 'Valid next of kin phone required' })
        hasError = true
      }
    })
    if (hasError) return
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
            <span className="text-gray-700 font-medium">
              {seatNumbers.length === 1 ? `Seat ${seatNumbers[0]}` : `${seatNumbers.length} seats (${seatNumbers.join(', ')})`}
            </span>
            <span className="font-bold text-lg text-primary">{formatCurrency(amount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* One passenger card per seat */}
          {fields.map((field, i) => (
            <div key={field.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Passenger — Seat {field.seatNumber}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full name {!isAuthenticated && '*'}</label>
                  <input
                    {...register(`passengers.${i}.guestName`)}
                    className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Rider's full name"
                  />
                  {errors.passengers?.[i]?.guestName && <p className="text-red-500 text-xs mt-1">{errors.passengers[i]?.guestName?.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone {!isAuthenticated && '*'}</label>
                  <input
                    {...register(`passengers.${i}.guestPhone`)}
                    className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="08012345678"
                  />
                  {errors.passengers?.[i]?.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.passengers[i]?.guestPhone?.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email (for ticket delivery)</label>
                  <input
                    {...register(`passengers.${i}.guestEmail`)}
                    type="email"
                    className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="you@example.com"
                  />
                  {errors.passengers?.[i]?.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.passengers[i]?.guestEmail?.message}</p>}
                </div>
              </div>

              {/* Next of kin — safety contact, collected for every passenger */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Next of Kin</p>
                <p className="text-xs text-gray-400 mb-3">A contact we can reach in case of an emergency during this seat's trip.</p>
                {i > 0 && (
                  <label className="flex items-center gap-2 mb-3 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reuseFirstNok[i] ?? false}
                      onChange={(e) => toggleReuseNok(i, e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    Same as Seat {fields[0]?.seatNumber}'s next of kin
                  </label>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full name *</label>
                    <input
                      {...register(`passengers.${i}.nokName`)}
                      disabled={reuseFirstNok[i]}
                      className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="Next of kin's full name"
                    />
                    {errors.passengers?.[i]?.nokName && <p className="text-red-500 text-xs mt-1">{errors.passengers[i]?.nokName?.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone *</label>
                    <input
                      {...register(`passengers.${i}.nokPhone`)}
                      disabled={reuseFirstNok[i]}
                      className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="08012345678"
                    />
                    {errors.passengers?.[i]?.nokPhone && <p className="text-red-500 text-xs mt-1">{errors.passengers[i]?.nokPhone?.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Payment method */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Method</p>
            <div className="flex items-center gap-2 p-3 border-2 border-primary bg-primary/10 text-primary rounded-xl text-sm font-semibold">
              <CreditCard className="w-4 h-4" /> Pay Online (Card / Bank Transfer)
            </div>
            <p className="text-xs text-gray-400 mt-2">Cash payments are only handled in person by a MaidAutos agent at the terminal.</p>
          </div>

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
