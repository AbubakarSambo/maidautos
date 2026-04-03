import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Bus } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">MaidAutos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sign in</h2>
          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input {...register('email')} type="email" className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input {...register('password')} type="password" className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-green-600 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors">
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
