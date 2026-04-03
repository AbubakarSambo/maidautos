import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { driversApi } from '@/api'
import { toast } from 'sonner'
import type { Driver } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  ON_TRIP: 'bg-blue-100 text-blue-700',
  OFF_DUTY: 'bg-gray-100 text-gray-500',
}

export function AdminDriversPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: drivers = [], isLoading } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: driversApi.findAll })

  const { register, handleSubmit, reset } = useForm()
  const { mutate: create, isPending } = useMutation({
    mutationFn: driversApi.create,
    onSuccess: () => { toast.success('Driver added'); reset(); setShowForm(false); qc.invalidateQueries({ queryKey: ['drivers'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: driversApi.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => create(d))} className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Add Driver</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">First Name</label><input {...register('firstName', { required: true })} className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">Last Name</label><input {...register('lastName', { required: true })} className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">Phone</label><input {...register('phone', { required: true })} className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">License Number</label><input {...register('licenseNumber', { required: true })} className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">License Expiry</label><input {...register('licenseExpiry', { required: true })} type="date" className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">NIN (optional)</label><input {...register('nin')} className="mt-0.5 w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {drivers.map((driver) => (
            <div key={driver.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${!driver.isActive ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                {driver.firstName[0]}{driver.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{driver.firstName} {driver.lastName}</p>
                <p className="text-sm text-gray-500">{driver.phone} · License: {driver.licenseNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[driver.status]}`}>{driver.status}</span>
                <button onClick={() => toggle(driver.id)} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  {driver.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
