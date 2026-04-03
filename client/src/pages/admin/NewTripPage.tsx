import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { routesApi, carsApi, driversApi, tripsApi } from '@/api'
import { formatDuration } from '@/lib/utils'
import { toast } from 'sonner'
import type { Route, Car, Driver } from '@/types'

const schema = z.object({
  routeId: z.string().min(1, 'Select a route'),
  carId: z.string().min(1, 'Select a car'),
  driverId: z.string().min(1, 'Select a driver'),
  departureDateTime: z.string().min(1, 'Set a departure date and time'),
  priceOverride: z.string().optional(),
  notes: z.string().optional(),
})

type Form = z.infer<typeof schema>

export function AdminNewTripPage() {
  const navigate = useNavigate()

  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: routesApi.findAll,
  })
  const { data: cars = [] } = useQuery<Car[]>({
    queryKey: ['cars-active'],
    queryFn: carsApi.findActive,
  })
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers-available'],
    queryFn: driversApi.findAvailable,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const selectedRouteId = watch('routeId')
  const selectedCarId = watch('carId')
  const selectedRoute = routes.find((r) => r.id === selectedRouteId)
  const selectedCar = cars.find((c) => c.id === selectedCarId)

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data: Form) =>
      tripsApi.create({
        ...data,
        priceOverride: data.priceOverride ? Number(data.priceOverride) : undefined,
      }),
    onSuccess: (trip) => {
      toast.success('Trip created')
      navigate(`/admin/trips/${trip.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create trip'),
  })

  // Minimum datetime = now (local ISO string without seconds)
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/trips')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Trip</h1>
      </div>

      <form onSubmit={handleSubmit((d) => create(d))} className="space-y-5">

        {/* Route */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Route & Schedule</h2>

          <div>
            <label className="text-sm font-medium text-gray-700">Route *</label>
            <select
              {...register('routeId')}
              className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a route</option>
              {routes
                .filter((r) => r.isActive)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.originStop.name} → {r.destinationStop.name}
                    {r.estimatedDurationMinutes ? ` (${formatDuration(r.estimatedDurationMinutes)})` : ''}
                  </option>
                ))}
            </select>
            {errors.routeId && <p className="text-red-500 text-xs mt-1">{errors.routeId.message}</p>}
          </div>

          {selectedRoute && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-700 mb-1">Stops on this route</p>
              <div className="space-y-1">
                {selectedRoute.routeStops.map((rs) => (
                  <div key={rs.id} className="flex items-center gap-2 text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>{rs.stop.name}</span>
                    <span className="ml-auto text-gray-400">
                      ₦{Number(rs.priceFromOrigin).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Departure date & time *</label>
            <input
              {...register('departureDateTime')}
              type="datetime-local"
              min={minDateTime}
              className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {errors.departureDateTime && (
              <p className="text-red-500 text-xs mt-1">{errors.departureDateTime.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Price override <span className="text-gray-400 font-normal">(optional — leave blank to use route pricing)</span>
            </label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
              <input
                {...register('priceOverride')}
                type="number"
                min={0}
                step={100}
                placeholder="e.g. 15000"
                className="w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Vehicle & Driver */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Vehicle & Driver</h2>

          <div>
            <label className="text-sm font-medium text-gray-700">Car *</label>
            <select
              {...register('carId')}
              className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a car</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.make} {c.model} — {c.plateNumber} ({c.capacity} seats · {c.type}
                  {c.hasAC ? ' · AC' : ''})
                </option>
              ))}
            </select>
            {errors.carId && <p className="text-red-500 text-xs mt-1">{errors.carId.message}</p>}
            {cars.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">No active cars — add one in Fleet first.</p>
            )}
          </div>

          {selectedCar && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {selectedCar.make} {selectedCar.model} · {selectedCar.year} · {selectedCar.capacity} passenger seats
              {selectedCar.hasAC ? ' · Air conditioned' : ''}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Driver *</label>
            <select
              {...register('driverId')}
              className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName} — {d.phone}
                </option>
              ))}
            </select>
            {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
            {drivers.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">No available drivers — check driver statuses.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border p-5">
          <label className="text-sm font-medium text-gray-700">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Any internal notes about this trip..."
            className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {isPending ? 'Creating trip...' : 'Create Trip'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/trips')}
            className="px-6 py-3 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
