import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { adminApi } from '@/api'
import { formatCurrency } from '@/lib/utils'

type RevenueRow = { label: string; revenue: number; count: number }

type Preset = 'all' | '30d' | '90d' | 'custom'

function presetRange(preset: Preset): { startDate?: string; endDate?: string } {
  if (preset === 'all') return {}
  const days = preset === '30d' ? 30 : 90
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { startDate: start.toISOString().slice(0, 10) }
}

function formatCompact(amount: number) {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`
  return `₦${amount}`
}

export function RevenueByRouteSection() {
  const [preset, setPreset] = useState<Preset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [view, setView] = useState<'chart' | 'table'>('chart')

  const range = preset === 'custom' ? { startDate: customStart || undefined, endDate: customEnd || undefined } : presetRange(preset)

  const { data = [], isFetching } = useQuery<RevenueRow[]>({
    queryKey: ['revenue-by-route', range.startDate, range.endDate],
    queryFn: () => adminApi.getRevenueByRoute(range),
    placeholderData: (prev) => prev,
  })

  const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0)
  const showDirectLabels = data.length <= 10

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Revenue by Route</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets */}
          <div className="flex rounded-xl border-2 border-outline-variant overflow-hidden">
            {([
              ['all', 'All time'],
              ['30d', '30 days'],
              ['90d', '90 days'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPreset(value)}
                className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  preset === value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPreset('custom') }}
              className="px-2 py-1.5 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPreset('custom') }}
              className="px-2 py-1.5 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-xl border-2 border-outline-variant overflow-hidden">
            {(['chart', 'table'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
        {data.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No paid bookings in this range.</p>
        ) : view === 'chart' ? (
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: showDirectLabels ? 64 : 16, bottom: 4, left: 0 }}>
              <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(139,26,26,0.06)' }} />
              <Bar dataKey="revenue" fill="#8b1a1a" radius={[0, 4, 4, 0]} barSize={20}>
                {showDirectLabels && (
                  <LabelList dataKey="revenue" position="right" formatter={(v: any) => formatCurrency(Number(v))} style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b-2 border-gray-900">
                  <th className="py-2 pr-2 font-bold text-gray-900">Route</th>
                  <th className="py-2 pr-2 font-bold text-gray-900 text-right">Bookings</th>
                  <th className="py-2 pl-2 font-bold text-gray-900 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.label} className="border-b border-gray-100">
                    <td className="py-2 pr-2">{r.label}</td>
                    <td className="py-2 pr-2 text-right text-gray-500">{r.count}</td>
                    <td className="py-2 pl-2 text-right font-semibold text-primary">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function RevenueTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row: RevenueRow = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-900 mb-1">{row.label}</p>
      <p className="text-primary font-bold text-sm">{formatCurrency(row.revenue)}</p>
      <p className="text-gray-500">{row.count} booking{row.count === 1 ? '' : 's'}</p>
    </div>
  )
}
