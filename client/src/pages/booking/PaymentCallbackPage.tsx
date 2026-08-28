import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paystackApi } from '@/api'
import { toast } from 'sonner'

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
          toast.error('Payment was not completed — your seat has been released. You can try again.')
          navigate('/')
        }
      })
      .catch(() => navigate('/'))
  }, [reference])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white" style={{ backgroundColor: '#610000' }}>
      <div className="w-10 h-10 border-2 border-[#ffb4a8] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/70">Confirming your payment...</p>
    </div>
  )
}
