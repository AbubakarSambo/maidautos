import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const { setAuth } = useAuthStore()

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      const dest = data.user.role === 'PASSENGER' ? '/account/bookings' : '/admin'
      navigate(dest, { replace: true })
    },
  })

  useEffect(() => { if (token) mutate() }, [token])

  if (isPending) return <div className="min-h-screen flex items-center justify-center text-gray-500">Verifying your email...</div>
  if (isError) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-red-600 font-semibold mb-2">Verification failed</p>
        <p className="text-gray-500 text-sm mb-4">The link may have expired. Try resending the verification email.</p>
        <button onClick={() => navigate('/login')} className="text-green-600 font-medium hover:underline text-sm">Back to login</button>
      </div>
    </div>
  )

  return null
}

export function CheckEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm bg-white rounded-2xl border p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📧</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
      </div>
    </div>
  )
}
