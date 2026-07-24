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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white" style={{ backgroundColor: '#0b1c30' }}>
      <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-white/70">Confirming your payment...</p>
    </div>
  )
}
