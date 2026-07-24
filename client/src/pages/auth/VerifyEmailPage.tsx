import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from '@/components/layout'

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

  if (isPending) return (
    <AuthShell>
      <p className="text-center text-gray-500">Verifying your email...</p>
    </AuthShell>
  )
  if (isError) return (
    <AuthShell>
      <div className="text-center">
        <p className="text-red-600 font-bold mb-2">Verification failed</p>
        <p className="text-gray-500 text-sm mb-4">The link may have expired. Try resending the verification email.</p>
        <button onClick={() => navigate('/login')} className="text-green-700 font-semibold hover:underline text-sm">Back to login</button>
      </div>
    </AuthShell>
  )

  return null
}

export function CheckEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  return (
    <AuthShell>
      <div className="text-center">
        <div className="w-16 h-16 bg-green-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-green-700" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
      </div>
    </AuthShell>
  )
}
