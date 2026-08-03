import { useQuery } from '@tanstack/react-query'
import { routesApi } from '@/api'
import { PageShell } from '../legal/PageShell'
import { RouteScheduleCard } from './RouteScheduleCard'
import type { Route } from '@/types'

export function RoutesPage() {
  const { data: routes = [], isLoading } = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: routesApi.findAll,
  })

  const activeRoutes = routes.filter((r) => r.isActive)

  return (
    <PageShell title="Routes & Schedule" contentClassName="max-w-4xl" proseStyles={false}>
      <p className="text-on-surface-variant leading-relaxed -mt-6 mb-4">
        Browse our active routes and see scheduled trips for the next 7 days. Pick a day to view departure
        times, vehicles, and prices — then book directly.
      </p>

      {isLoading ? (
        <p className="text-on-surface-variant py-8">Loading routes...</p>
      ) : activeRoutes.length === 0 ? (
        <p className="text-on-surface-variant py-8">No active routes right now — check back soon.</p>
      ) : (
        <div className="space-y-6">
          {activeRoutes.map((route) => (
            <RouteScheduleCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
