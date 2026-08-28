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
      <div className="flex items-center justify-center gap-4 mb-5 text-xs text-gray-600 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-gray-100 border border-gray-300" /> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-primary" /> Selected</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-gray-400" /> Taken</div>
        {premiumSeatNumbers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-gray-100 border-2 border-amber-400" /> Premium (+{formatCurrency(premiumSeatSurcharge)})
          </div>
        )}
      </div>

      {/* Cabin */}
      <div className="mx-auto w-fit rounded-[2rem] bg-gray-50 border border-gray-200 px-6 pt-5 pb-6">
        {/* Front — only shown when the driver isn't already placed inline in the grid */}
        {!hasInlineDriver && (
          <div className="flex flex-col items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-sm">🚗</div>
            <div className="w-16 h-1 rounded-full bg-gray-200 mt-2" />
          </div>
        )}

        <div className="space-y-2">
          {layout.rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-center gap-2">
              {row.map((seat, colIdx) => {
                if (seat === null) {
                  return <div key={colIdx} className="w-11" />
                }

                if (seat === 'driver') {
                  return (
                    <div
                      key={colIdx}
                      title="Driver"
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm bg-white text-gray-500 border border-gray-300 shadow-sm"
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
                      'w-11 h-11 rounded-xl text-sm font-semibold transition-all border',
                      isTaken
                        ? 'bg-gray-400 border-gray-400 text-white cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary border-primary text-white scale-105 shadow-md'
                        : isPremium
                        ? 'bg-white border-2 border-amber-400 text-gray-700 shadow-sm hover:bg-surface-rose cursor-pointer'
                        : 'bg-white border-gray-300 text-gray-700 shadow-sm hover:border-primary/40 hover:bg-surface-rose cursor-pointer'
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
      </div>

      {selectedSeats.length > 0 && (
        <p className="text-center text-sm text-primary font-medium mt-4">
          {selectedSeats.length === 1
            ? `Seat ${selectedSeats[0]} selected`
            : `${selectedSeats.length} seats selected: ${[...selectedSeats].sort((a, b) => a - b).join(', ')}`}
        </p>
      )}
    </div>
  )
}
