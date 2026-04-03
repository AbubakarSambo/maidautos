import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authApi } from '@/api'
import { toast } from 'sonner'
import { useState } from 'react'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit } = useForm<{ email: string }>()

  const { mutate, isPending } = useMutation({
    mutationFn: ({ email }: { email: string }) => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: () => setSent(true), // Same response to prevent email enumeration
  })

  if (sent) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm bg-white rounded-2xl border p-8">
        <p className="font-semibold text-gray-900 mb-2">Email sent</p>
        <p className="text-gray-500 text-sm mb-4">If an account exists, a reset link has been sent.</p>
        <Link to="/login" className="text-green-600 font-medium text-sm hover:underline">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Forgot password?</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <input {...register('email')} type="email" required className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
          <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold">
            {isPending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <Link to="/login" className="block text-center text-sm text-gray-500 mt-4 hover:underline">Back to login</Link>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = [new URLSearchParams(window.location.search)]
  const token = searchParams.get('token') || ''
  const { register, handleSubmit, watch } = useForm<{ password: string; confirm: string }>()
  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: ({ password }: { password: string }) => authApi.resetPassword({ token, password }),
    onSuccess: () => toast.success('Password reset successfully'),
  })

  if (isSuccess) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm bg-white rounded-2xl border p-8">
        <p className="font-semibold text-gray-900 mb-4">Password updated!</p>
        <Link to="/login" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700">Sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Set new password</h2>
        <form onSubmit={handleSubmit((d) => { if (d.password !== d.confirm) { toast.error('Passwords do not match'); return } mutate(d) })} className="space-y-4">
          <input {...register('password')} type="password" required minLength={8} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="New password (min 8 chars)" />
          <input {...register('confirm')} type="password" required className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Confirm password" />
          <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold">
            {isPending ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
