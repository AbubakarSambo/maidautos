import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { routesApi } from '@/api'
import { formatDuration, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Route } from '@/types'

export function AdminRoutesPage() {
  const qc = useQueryClient()
  const { data: routes = [], isLoading } = useQuery<Route[]>({ queryKey: ['routes'], queryFn: routesApi.findAll })

  const { mutate: toggle } = useMutation({
    mutationFn: routesApi.toggleActive,
    onSuccess: () => { toast.success('Route updated'); qc.invalidateQueries({ queryKey: ['routes'] }) },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Routes</h1>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-semibold text-gray-900">{route.originStop.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{route.destinationStop.name}</span>
                </div>
                <span className="text-sm text-gray-500">{formatDuration(route.estimatedDurationMinutes)}</span>
                <button onClick={() => toggle(route.id)} className="text-gray-400 hover:text-gray-600">
                  {route.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>

              {/* Route stops */}
              <div className="space-y-1">
                {route.routeStops.map((rs) => (
                  <div key={rs.id} className="flex items-center gap-3 text-sm pl-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-gray-700 flex-1">{rs.stop.name}</span>
                    <span className="text-gray-400 text-xs">{rs.distanceFromOriginKm} km</span>
                    <span className="text-green-600 font-medium">{formatCurrency(rs.priceFromOrigin)}</span>
                  </div>
                ))}
              </div>

              {!route.isActive && (
                <p className="text-xs text-red-500 mt-2">Inactive — not bookable</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
