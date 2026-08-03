import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { AuthShell } from '@/components/layout'

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
      const dest = data.user.role === 'PASSENGER' ? '/' : '/admin'
      navigate(dest, { replace: true })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Login failed'),
  })

  return (
    <AuthShell>
      <h2 className="text-xl font-bold text-on-surface mb-6">Sign in</h2>
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
