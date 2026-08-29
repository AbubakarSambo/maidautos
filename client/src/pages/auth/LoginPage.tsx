import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, googleLoginUrl } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { AuthShell } from '@/components/layout'
import { posthog } from '@/lib/posthog'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})
type Form = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      posthog.capture('login', { method: 'password' })
      const dest = data.user.role === 'PASSENGER' ? '/' : '/admin'
      navigate(dest, { replace: true })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Login failed'),
  })

  return (
    <AuthShell>
      <h2 className="text-xl font-bold text-on-surface mb-6">Sign in</h2>

      <a
        href={googleLoginUrl}
        className="w-full flex items-center justify-center gap-2 border border-outline-variant rounded-xl py-3 text-sm font-semibold text-on-surface hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.18 3.56-8.84z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29V6.6H1.27A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z" />
        </svg>
        Continue with Google
      </a>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
          <input {...register('email')} type="email" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="you@example.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
          <input {...register('password')} type="password" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" disabled={isPending} className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors shadow-lg">
          {isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-semibold hover:underline">Register</Link>
      </p>
    </AuthShell>
  )
}
