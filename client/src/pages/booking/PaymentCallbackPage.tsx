import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const bookingId = searchParams.get('bookingId')

  useEffect(() => {
    if (!reference) {
      navigate('/')
      return
    }

    // Verify payment then redirect to confirmation
    fetch(`/api/v1/paystack/verify/${reference}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.metadata?.bookingId || bookingId) {
          const id = data.data?.metadata?.bookingId || bookingId
          // Fetch the booking to get ticket code
          fetch(`/api/v1/bookings/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          })
            .then((r) => r.json())
            .then((b) => navigate(`/booking/confirmation/${b.data?.ticketCode || ''}`, { replace: true }))
            .catch(() => navigate('/'))
        } else {
          navigate('/')
        }
      })
      .catch(() => navigate('/'))
  }, [reference])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Confirming your payment...
    </div>
  )
}
