import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bus } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { carsApi } from '@/api'
import { toast } from 'sonner'
import { Select } from '@/components/shared'
import type { Car, CarType } from '@/types'

type CarForm = {
  plateNumber: string
  make: string
  model: string
  year: number
  type: CarType
  capacity: number
  hasAC: string
}

export function AdminCarsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: cars = [], isLoading } = useQuery<Car[]>({ queryKey: ['cars'], queryFn: carsApi.findAll })

  const { register, control, handleSubmit, reset } = useForm<CarForm>({ defaultValues: { type: 'SEDAN', hasAC: 'true' } })
  const { mutate: create, isPending } = useMutation({
    mutationFn: carsApi.create,
    onSuccess: () => { toast.success('Car added'); reset(); setShowForm(false); qc.invalidateQueries({ queryKey: ['cars'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => carsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['cars'] }) },
  })

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-amber-100 text-amber-700',
    RETIRED: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Fleet</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Car
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => create({ ...d, year: Number(d.year), capacity: Number(d.capacity), hasAC: d.hasAC === 'true' }))} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Add New Car</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Plate Number</label><input {...register('plateNumber', { required: true })} className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs text-gray-500">Make</label><input {...register('make', { required: true })} placeholder="Toyota" className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs text-gray-500">Model</label><input {...register('model', { required: true })} placeholder="Hiace" className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div><label className="text-xs text-gray-500">Year</label><input {...register('year', { required: true })} type="number" defaultValue={2022} className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={(['SEDAN', 'SIENA', 'HIACE', 'COASTER', 'BUS'] as CarType[]).map((t) => ({ value: t, label: t }))}
                    className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              />
            </div>
            <div><label className="text-xs text-gray-500">Capacity (seats)</label><input {...register('capacity', { required: true })} type="number" defaultValue={14} className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" /></div>
            <div>
              <label className="text-xs text-gray-500">AC</label>
              <Controller
                name="hasAC"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                    className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-primary hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {cars.map((car) => (
            <div key={car.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <Bus className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{car.make} {car.model} <span className="text-gray-400 font-normal text-sm">({car.year})</span></p>
                <p className="text-sm text-gray-500">{car.plateNumber} · {car.type} · {car.capacity} seats · {car.hasAC ? 'AC' : 'No AC'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[car.status]}`}>{car.status}</span>
                <Select
                  value={car.status}
                  onChange={(status) => updateStatus({ id: car.id, status })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'MAINTENANCE', label: 'Maintenance' },
                    { value: 'RETIRED', label: 'Retired' },
                  ]}
                  className="text-xs border border-outline-variant rounded-lg pl-2 pr-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary min-w-[7.5rem]"
                  chevronClassName="w-3.5 h-3.5"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
