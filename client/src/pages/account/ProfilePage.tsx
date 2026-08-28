import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

type ProfileForm = {
  firstName: string
  lastName: string
  phone: string
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Profile updated')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update profile'),
  })

  const onSubmit = (data: ProfileForm) => {
    if (!data.firstName.trim() || !data.lastName.trim()) return
    mutate({ firstName: data.firstName.trim(), lastName: data.lastName.trim(), phone: data.phone.trim() || undefined })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-dark px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-white">Profile</span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">First name</label>
              <input
                {...register('firstName', { required: 'Required' })}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Last name</label>
              <input
                {...register('lastName', { required: 'Required' })}
                className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</label>
            <input
              {...register('phone')}
              placeholder="08012345678"
              className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
            <input value={user?.email || ''} disabled className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm bg-gray-50 text-gray-400" />
            <p className="text-xs text-gray-400 mt-1">Email can't be changed here.</p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors shadow-lg"
          >
            {isPending ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
