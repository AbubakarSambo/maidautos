import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import apiClient from '@/api/client'
import { toast } from 'sonner'

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/users?role=ADMIN').then((r) => r.data.data),
  })

  const { register, handleSubmit, reset } = useForm()
  const { mutate: create, isPending } = useMutation({
    mutationFn: (data: any) => apiClient.post('/users', data).then((r) => r.data.data),
    onSuccess: () => { toast.success('Admin created'); reset(); setShowForm(false); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/toggle`).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Team</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => create({ ...d, role: 'ADMIN' }))} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Add City Admin</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">First Name</label><input {...register('firstName', { required: true })} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Last Name</label><input {...register('lastName', { required: true })} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label><input {...register('email', { required: true })} type="email" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</label><input {...register('phone')} className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">City</label><input {...register('adminCity')} placeholder="Abuja" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label><input {...register('password', { required: true, minLength: 8 })} type="password" className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 transition-colors">Create Admin</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {isLoading ? <div className="py-8 text-center text-gray-500">Loading...</div> : users.map((user: any) => (
          <div key={user.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${!user.isActive ? 'opacity-50' : ''}`}>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.email} · {user.adminCity || 'No city'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>
              <button onClick={() => toggle(user.id)} className="text-xs text-gray-500 hover:text-gray-700 underline">{user.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
