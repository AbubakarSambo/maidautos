import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bus, Pencil, Check, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { carsApi } from '@/api'
import { formatCurrency } from '@/lib/utils'
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
  hasWifi: string
  hasMeals: string
  premiumSeatNumbers: string
  premiumSeatSurcharge: number
}

// "1, 2, 5" -> [1, 2, 5], ignoring blanks/invalid entries
function parseSeatNumbers(input: string): number[] {
  return [...new Set(
    input
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  )]
}

export function AdminCarsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null)
  const [capacityDraft, setCapacityDraft] = useState('')
  const [editingPricingId, setEditingPricingId] = useState<string | null>(null)
  const [premiumSeatsDraft, setPremiumSeatsDraft] = useState('')
  const [surchargeDraft, setSurchargeDraft] = useState('')
  const { data: cars = [], isLoading } = useQuery<Car[]>({ queryKey: ['cars'], queryFn: carsApi.findAll })

  const { register, control, handleSubmit, reset } = useForm<CarForm>({
    defaultValues: { type: 'SEDAN', hasAC: 'true', hasWifi: 'false', hasMeals: 'false', premiumSeatNumbers: '', premiumSeatSurcharge: 0 },
  })
  const { mutate: create, isPending } = useMutation({
    mutationFn: carsApi.create,
    onSuccess: () => { toast.success('Car added'); reset(); setShowForm(false); qc.invalidateQueries({ queryKey: ['cars'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: updatePricing } = useMutation({
    mutationFn: ({ id, premiumSeatNumbers, premiumSeatSurcharge }: { id: string; premiumSeatNumbers: number[]; premiumSeatSurcharge: number }) =>
      carsApi.update(id, { premiumSeatNumbers, premiumSeatSurcharge }),
    onSuccess: () => {
      toast.success('Seat pricing updated')
      qc.invalidateQueries({ queryKey: ['cars'] })
      setEditingPricingId(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: updateAmenity } = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: 'hasAC' | 'hasWifi' | 'hasMeals'; value: boolean }) =>
      carsApi.update(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cars'] }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => carsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['cars'] }) },
  })

  const { mutate: updateCapacity, isPending: isUpdatingCapacity } = useMutation({
    mutationFn: ({ id, capacity }: { id: string; capacity: number }) => carsApi.update(id, { capacity }),
    onSuccess: () => {
      toast.success('Capacity updated')
      qc.invalidateQueries({ queryKey: ['cars'] })
      setEditingCapacityId(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const startEditingCapacity = (car: Car) => {
    setEditingCapacityId(car.id)
    setCapacityDraft(String(car.capacity))
  }

  const submitCapacity = (id: string) => {
    const capacity = Number(capacityDraft)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 60) {
      toast.error('Enter a valid capacity between 1 and 60')
      return
    }
    updateCapacity({ id, capacity })
  }

  const startEditingPricing = (car: Car) => {
    setEditingPricingId(car.id)
    setPremiumSeatsDraft(car.premiumSeatNumbers.join(', '))
    setSurchargeDraft(String(car.premiumSeatSurcharge))
  }

  const submitPricing = (id: string) => {
    const premiumSeatSurcharge = Number(surchargeDraft)
    if (!Number.isFinite(premiumSeatSurcharge) || premiumSeatSurcharge < 0) {
      toast.error('Enter a valid surcharge amount')
      return
    }
    updatePricing({ id, premiumSeatNumbers: parseSeatNumbers(premiumSeatsDraft), premiumSeatSurcharge })
  }

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
        <form
          onSubmit={handleSubmit((d) =>
            create({
              ...d,
              year: Number(d.year),
              capacity: Number(d.capacity),
              hasAC: d.hasAC === 'true',
              hasWifi: d.hasWifi === 'true',
              hasMeals: d.hasMeals === 'true',
              premiumSeatNumbers: parseSeatNumbers(d.premiumSeatNumbers),
              premiumSeatSurcharge: Number(d.premiumSeatSurcharge) || 0,
            }),
          )}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
        >
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
            <div>
              <label className="text-xs text-gray-500">Wi-Fi</label>
              <Controller
                name="hasWifi"
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
            <div>
              <label className="text-xs text-gray-500">Meals</label>
              <Controller
                name="hasMeals"
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
            <div>
              <label className="text-xs text-gray-500">Premium seat numbers</label>
              <input {...register('premiumSeatNumbers')} placeholder="e.g. 1, 2" className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Premium surcharge (₦)</label>
              <input {...register('premiumSeatSurcharge')} type="number" min={0} defaultValue={0} className="mt-0.5 w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
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
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <span>{car.plateNumber} · {car.type} ·</span>
                  {editingCapacityId === car.id ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        autoFocus
                        value={capacityDraft}
                        onChange={(e) => setCapacityDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitCapacity(car.id)
                          if (e.key === 'Escape') setEditingCapacityId(null)
                        }}
                        className="w-16 px-1.5 py-0.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        disabled={isUpdatingCapacity}
                        onClick={() => submitCapacity(car.id)}
                        className="text-green-600 hover:text-green-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditingCapacityId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditingCapacity(car)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {car.capacity} seats <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1">
                    {([
                      ['hasAC', 'AC'],
                      ['hasWifi', 'Wi-Fi'],
                      ['hasMeals', 'Meals'],
                    ] as const).map(([field, label]) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => updateAmenity({ id: car.id, field, value: !car[field] })}
                        title={`Click to ${car[field] ? 'disable' : 'enable'} ${label}`}
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border transition-colors ${
                          car[field]
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                </p>
                <div className="text-sm text-gray-500 mt-1">
                  {editingPricingId === car.id ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400">Premium seats</span>
                      <input
                        autoFocus
                        value={premiumSeatsDraft}
                        onChange={(e) => setPremiumSeatsDraft(e.target.value)}
                        placeholder="e.g. 1, 2"
                        className="w-24 px-1.5 py-0.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-gray-400">+₦</span>
                      <input
                        type="number"
                        min={0}
                        value={surchargeDraft}
                        onChange={(e) => setSurchargeDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitPricing(car.id)
                          if (e.key === 'Escape') setEditingPricingId(null)
                        }}
                        className="w-20 px-1.5 py-0.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button type="button" onClick={() => submitPricing(car.id)} className="text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditingPricingId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => startEditingPricing(car)} className="inline-flex items-center gap-1 hover:text-primary text-xs">
                      {car.premiumSeatNumbers.length > 0
                        ? `Premium seats ${car.premiumSeatNumbers.join(', ')} · +${formatCurrency(car.premiumSeatSurcharge)}`
                        : 'No premium seat pricing'}
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
