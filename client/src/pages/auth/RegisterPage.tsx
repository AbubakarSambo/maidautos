import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { toast } from 'sonner'
import { AuthShell } from '@/components/layout'

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type Form = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, vars) => {
      toast.success('Account created! Please check your email to verify.')
      navigate(`/check-email?email=${encodeURIComponent(vars.email)}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Registration failed'),
  })

  return (
    <AuthShell>
      <h2 className="text-xl font-bold text-on-surface mb-6">Create account</h2>
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">First name</label>
            <input {...register('firstName')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Last name</label>
            <input {...register('lastName')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
          <input {...register('email')} type="email" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone (optional)</label>
          <input {...register('phone')} type="tel" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="08012345678" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
          <input {...register('password')} type="password" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isPending} className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors mt-2 shadow-lg">
          {isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  )
}
