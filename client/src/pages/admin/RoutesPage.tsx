import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ToggleLeft, ToggleRight, Plus, X, Trash2, Pencil, Check } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { routesApi, stopsApi } from '@/api'
import { formatDuration, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import type { Route, RouteStop, Stop } from '@/types'

type RouteStopForm = { stopId: string; distanceFromOriginKm: string; priceFromOrigin: string }
type RouteForm = {
  originStopId: string
  destinationStopId: string
  estimatedDurationMinutes: string
  stops: RouteStopForm[]
}

function AddStopRow({ route, stops, onDone }: { route: Route; stops: Stop[]; onDone: () => void }) {
  const qc = useQueryClient()
  const [stopId, setStopId] = useState('')
  const [distance, setDistance] = useState('')
  const [price, setPrice] = useState('')

  const usedStopIds = new Set(route.routeStops.map((rs) => rs.stopId))
  const available = stops.filter((s) => !usedStopIds.has(s.id))

  const { mutate: addStop, isPending } = useMutation({
    mutationFn: () => routesApi.addStop(route.id, { stopId, distanceFromOriginKm: Number(distance), priceFromOrigin: Number(price) }),
    onSuccess: () => {
      toast.success('Stop added to route')
      qc.invalidateQueries({ queryKey: ['routes'] })
      setStopId(''); setDistance(''); setPrice('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add stop'),
  })

  return (
    <div className="flex items-center gap-2 mt-2 pt-3 border-t border-dashed border-gray-200">
      <select value={stopId} onChange={(e) => setStopId(e.target.value)} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent">
        <option value="">Select stop to add...</option>
        {available.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
      </select>
      <input value={distance} onChange={(e) => setDistance(e.target.value)} type="number" placeholder="Distance (km)" className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price from origin (₦)" className="w-40 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
      <button
        disabled={!stopId || !distance || !price || isPending}
        onClick={() => addStop()}
        className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-500 disabled:opacity-50 transition-colors"
      >
        Add
      </button>
      <button onClick={onDone} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
        <Check className="w-4 h-4" />
      </button>
    </div>
  )
}

function EditableStopRow({ rs }: { rs: RouteStop }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [distance, setDistance] = useState(String(rs.distanceFromOriginKm))
  const [price, setPrice] = useState(String(rs.priceFromOrigin))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => routesApi.updateStop(rs.id, { distanceFromOriginKm: Number(distance), priceFromOrigin: Number(price) }),
    onSuccess: () => {
      toast.success('Stop pricing updated')
      qc.invalidateQueries({ queryKey: ['routes'] })
      setEditing(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update stop'),
  })

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-1.5 py-0.5 -mx-1.5 transition-colors">
        <span className="text-gray-400 text-xs">{rs.distanceFromOriginKm} km</span>
        <span className="text-green-600 font-semibold">{formatCurrency(rs.priceFromOrigin)}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        type="number"
        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
      />
      <span className="text-gray-400 text-xs">km</span>
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
      />
      <button
        disabled={isPending}
        onClick={() => save()}
        className="p-1 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
        title="Save"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => { setEditing(false); setDistance(String(rs.distanceFromOriginKm)); setPrice(String(rs.priceFromOrigin)) }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function AdminRoutesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const { data: routes = [], isLoading } = useQuery<Route[]>({ queryKey: ['routes'], queryFn: routesApi.findAll })
  const { data: stops = [] } = useQuery<Stop[]>({ queryKey: ['stops'], queryFn: stopsApi.findAll })

  const { mutate: toggle } = useMutation({
    mutationFn: routesApi.toggleActive,
    onSuccess: () => { toast.success('Route updated'); qc.invalidateQueries({ queryKey: ['routes'] }) },
  })

  const { mutate: removeStop } = useMutation({
    mutationFn: routesApi.removeStop,
    onSuccess: () => { toast.success('Stop removed from route'); qc.invalidateQueries({ queryKey: ['routes'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove stop'),
  })

  const { mutate: removeRoute } = useMutation({
    mutationFn: routesApi.remove,
    onSuccess: () => { toast.success('Route deleted'); qc.invalidateQueries({ queryKey: ['routes'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete route'),
  })

  const { register, control, handleSubmit, reset, watch } = useForm<RouteForm>({
    defaultValues: { originStopId: '', destinationStopId: '', estimatedDurationMinutes: '', stops: [{ stopId: '', distanceFromOriginKm: '0', priceFromOrigin: '0' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'stops' })

  const { mutate: create, isPending } = useMutation({
    mutationFn: routesApi.create,
    onSuccess: () => {
      toast.success('Route created')
      reset({ originStopId: '', destinationStopId: '', estimatedDurationMinutes: '', stops: [{ stopId: '', distanceFromOriginKm: '0', priceFromOrigin: '0' }] })
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create route'),
  })

  const onSubmit = (d: RouteForm) => {
    create({
      originStopId: d.originStopId,
      destinationStopId: d.destinationStopId,
      estimatedDurationMinutes: Number(d.estimatedDurationMinutes),
      stops: d.stops.map((s, i) => ({
        stopId: s.stopId,
        order: i,
        distanceFromOriginKm: Number(s.distanceFromOriginKm),
        priceFromOrigin: Number(s.priceFromOrigin),
      })),
    })
  }

  const destinationId = watch('destinationStopId')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Routes</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-500 shadow-lg shadow-green-900/10 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Route
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Add New Route</h3>
          <p className="text-xs text-gray-500">
            The last stop in the list below should be the destination. Prices are cumulative from the origin, so a passenger's
            fare is the difference between their pickup and dropoff stop prices.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Origin</label>
              <select {...register('originStopId', { required: true })} className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent">
                <option value="">Select stop...</option>
                {stops.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Destination</label>
              <select {...register('destinationStopId', { required: true })} className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent">
                <option value="">Select stop...</option>
                {stops.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estimated Duration (minutes)</label>
              <input {...register('estimatedDurationMinutes', { required: true })} type="number" placeholder="360" className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Route Stops (in order, origin first)</label>
              <button
                type="button"
                onClick={() => append({ stopId: '', distanceFromOriginKm: '0', priceFromOrigin: '0' })}
                className="text-xs text-green-700 font-bold hover:underline"
              >
                + Add stop
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                <select {...register(`stops.${index}.stopId`, { required: true })} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent">
                  <option value="">Select stop...</option>
                  {stops.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
                </select>
                <input
                  {...register(`stops.${index}.distanceFromOriginKm`, { required: true })}
                  type="number"
                  placeholder="Distance (km)"
                  className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <input
                  {...register(`stops.${index}.priceFromOrigin`, { required: true })}
                  type="number"
                  placeholder="Price (₦)"
                  className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {destinationId && !fields.some((f, i) => watch(`stops.${i}.stopId`) === destinationId) && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Tip: the destination stop should also appear as the last row above, with its full-route price.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-500 disabled:opacity-50 shadow-lg shadow-green-900/10 transition-colors">
              Save Route
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const isEditing = editingRouteId === route.id
            return (
              <div key={route.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-gray-900">{route.originStop.name}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-gray-900">{route.destinationStop.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDuration(route.estimatedDurationMinutes)}</span>
                  <button onClick={() => toggle(route.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title={route.isActive ? 'Deactivate' : 'Activate'}>
                    {route.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingRouteId(isEditing ? null : route.id)}
                    className={isEditing ? 'text-green-600 transition-colors' : 'text-gray-400 hover:text-gray-600 transition-colors'}
                    title="Manage stops"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {user?.role === 'SUPER_ADMIN' && (
                    <button
                      onClick={() => { if (confirm(`Delete the ${route.originStop.name} → ${route.destinationStop.name} route? This cannot be undone.`)) removeRoute(route.id) }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete route"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Route stops */}
                <div className="space-y-1">
                  {route.routeStops.map((rs) => {
                    const isEndpoint = rs.stopId === route.originStopId || rs.stopId === route.destinationStopId
                    return (
                      <div key={rs.id} className="flex items-center gap-3 text-sm pl-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-gray-700 flex-1">{rs.stop.name}</span>
                        {isEditing ? (
                          <EditableStopRow rs={rs} />
                        ) : (
                          <>
                            <span className="text-gray-400 text-xs">{rs.distanceFromOriginKm} km</span>
                            <span className="text-green-600 font-semibold">{formatCurrency(rs.priceFromOrigin)}</span>
                          </>
                        )}
                        {isEditing && !isEndpoint && (
                          <button
                            onClick={() => { if (confirm(`Remove ${rs.stop.name} from this route?`)) removeStop(rs.id) }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isEditing && isEndpoint && <div className="w-[22px]" />}
                      </div>
                    )
                  })}
                </div>

                {isEditing && <AddStopRow route={route} stops={stops} onDone={() => setEditingRouteId(null)} />}

                {!route.isActive && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Inactive — not bookable</p>
                )}
              </div>
            )
          })}
          {routes.length === 0 && <div className="py-16 text-center text-gray-500">No routes yet — add one to get started.</div>}
        </div>
      )}
    </div>
  )
}
