import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paystackApi } from '@/api'

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  useEffect(() => {
    if (!reference) {
      navigate('/')
      return
    }

    paystackApi
      .verify(reference)
      .then((data) => {
        if (data.ticketCode) {
          navigate(`/booking/confirmation/${data.ticketCode}`, { replace: true })
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
