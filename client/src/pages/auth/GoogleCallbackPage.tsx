import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const ranOnce = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (ranOnce.current) return
    ranOnce.current = true

    if (!token) {
      toast.error('Google sign-in failed')
      navigate('/login', { replace: true })
      return
    }

    // authApi.getProfile() reads the token from localStorage via the axios interceptor,
    // so stash it there first, then confirm it's valid before committing to the store.
    localStorage.setItem('token', token)

    authApi
      .getProfile()
      .then((user) => {
        setAuth(user, token)
        navigate(user.role === 'PASSENGER' ? '/' : '/admin', { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('token')
        toast.error('Google sign-in failed')
        navigate('/login', { replace: true })
      })
  }, [token, navigate, setAuth])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white" style={{ backgroundColor: '#610000' }}>
      <div className="w-10 h-10 border-2 border-[#ffb4a8] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/70">Signing you in...</p>
    </div>
  )
}
