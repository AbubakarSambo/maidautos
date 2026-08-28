import { cn, formatCurrency, getSeatLayout } from '@/lib/utils'
import type { CarType } from '@/types'

interface Props {
  carType: CarType
  capacity: number
  takenSeats: number[]
  selectedSeats: number[]
  onToggleSeat: (seat: number) => void
  readOnly?: boolean
  premiumSeatNumbers?: number[]
  premiumSeatSurcharge?: number
}

export function SeatGrid({
  carType,
  capacity,
  takenSeats,
  selectedSeats,
  onToggleSeat,
  readOnly,
  premiumSeatNumbers = [],
  premiumSeatSurcharge = 0,
}: Props) {
  const layout = getSeatLayout(carType, capacity)
  const hasInlineDriver = layout.rows.some((row) => row.includes('driver'))

  return (
    <div className="select-none">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-600 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-gray-100 border border-gray-300" /> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-primary" /> Selected</div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-gray-400" /> Taken</div>
        {premiumSeatNumbers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-gray-100 border-2 border-amber-400" /> Premium (+{formatCurrency(premiumSeatSurcharge)})
          </div>
        )}
      </div>

      {/* Front label — only shown when the driver isn't already placed inline in the grid */}
      {!hasInlineDriver && (
        <>
          <div className="text-center text-xs text-gray-400 mb-2 font-medium tracking-wider uppercase">Driver</div>
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-t-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">🚗</div>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        {layout.rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-1">
            {row.map((seat, colIdx) => {
              if (seat === null) {
                return <div key={colIdx} className="w-5" />
              }

              if (seat === 'driver') {
                return (
                  <div
                    key={colIdx}
                    title="Driver"
                    className="w-8 h-8 rounded flex items-center justify-center text-xs bg-gray-200 text-gray-500 border border-gray-300"
                  >
                    🚗
                  </div>
                )
              }

              const isTaken = takenSeats.includes(seat)
              const isSelected = selectedSeats.includes(seat)
              const isPremium = premiumSeatNumbers.includes(seat)

              return (
                <button
                  key={colIdx}
                  disabled={isTaken || readOnly}
                  onClick={() => !isTaken && !readOnly && onToggleSeat(seat)}
                  className={cn(
                    'w-8 h-8 rounded text-xs font-medium transition-all border',
                    isTaken
                      ? 'bg-gray-400 border-gray-400 text-white cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary border-primary text-white scale-105 shadow-sm'
                      : isPremium
                      ? 'bg-gray-100 border-2 border-amber-400 text-gray-700 hover:bg-surface-rose cursor-pointer'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-primary/40 hover:bg-surface-rose cursor-pointer'
                  )}
                  title={
                    isTaken
                      ? `Seat ${seat} — Booked`
                      : isPremium
                      ? `Seat ${seat} — Premium (+${formatCurrency(premiumSeatSurcharge)})`
                      : `Seat ${seat}`
                  }
                >
                  {seat}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selectedSeats.length > 0 && (
        <p className="text-center text-sm text-primary font-medium mt-3">
          {selectedSeats.length === 1
            ? `Seat ${selectedSeats[0]} selected`
            : `${selectedSeats.length} seats selected: ${[...selectedSeats].sort((a, b) => a - b).join(', ')}`}
        </p>
      )}
    </div>
  )
}
