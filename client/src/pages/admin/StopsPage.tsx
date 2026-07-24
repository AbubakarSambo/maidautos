import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { stopsApi } from '@/api'
import { toast } from 'sonner'
import type { Stop } from '@/types'

export function AdminStopsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Stop | null>(null)
  const { data: stops = [], isLoading } = useQuery<Stop[]>({ queryKey: ['stops'], queryFn: stopsApi.findAll })

  const { register, handleSubmit, reset } = useForm()

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: stopsApi.create,
    onSuccess: () => { toast.success('Stop added'); reset(); setShowForm(false); qc.invalidateQueries({ queryKey: ['stops'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => stopsApi.update(id, data),
    onSuccess: () => { toast.success('Stop updated'); reset(); setEditing(null); qc.invalidateQueries({ queryKey: ['stops'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: stopsApi.remove,
    onSuccess: () => { toast.success('Stop removed'); qc.invalidateQueries({ queryKey: ['stops'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed — stop may be used by a route'),
  })

  const startEdit = (stop: Stop) => {
    setShowForm(false)
    setEditing(stop)
    reset({ name: stop.name, state: stop.state })
  }

  const onSubmit = (d: any) => {
    if (editing) update({ id: editing.id, data: d })
    else create(d)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Stops</h1>
        <button
          onClick={() => { setEditing(null); reset({ name: '', state: '' }); setShowForm(true) }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-500 shadow-lg shadow-green-900/10 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Stop
        </button>
      </div>

      {(showForm || editing) && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-900">{editing ? 'Edit Stop' : 'Add New Stop'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">City / Terminal Name</label>
              <input {...register('name', { required: true })} placeholder="Abuja" className="mt-0.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs text-gray-500">State</label>
              <input {...register('state', { required: true })} placeholder="FCT" className="mt-0.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating || updating} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-500 disabled:opacity-50 shadow-lg shadow-green-900/10 transition-colors">
              Save
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {stops.map((stop) => (
            <div key={stop.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{stop.name}</p>
                <p className="text-sm text-gray-500">{stop.state} · {stop.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(stop)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete ${stop.name}?`)) remove(stop.id) }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {stops.length === 0 && <div className="py-16 text-center text-gray-500">No stops yet — add one to get started.</div>}
        </div>
      )}
    </div>
  )
}
