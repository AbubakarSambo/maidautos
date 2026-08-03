import { cn, getSeatLayout } from '@/lib/utils'
import type { CarType } from '@/types'

interface Props {
  carType: CarType
  capacity: number
  takenSeats: number[]
  selectedSeat: number | null
  onSelectSeat: (seat: number) => void
  readOnly?: boolean
}

export function SeatGrid({ carType, capacity, takenSeats, selectedSeat, onSelectSeat, readOnly }: Props) {
  const layout = getSeatLayout(carType, capacity)

  return (
    <div className="select-none">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-gray-100 border border-gray-300" /> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-primary" /> Selected</div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-gray-400" /> Taken</div>
      </div>

      {/* Front label */}
      <div className="text-center text-xs text-gray-400 mb-2 font-medium tracking-wider uppercase">Driver</div>
      <div className="flex justify-center mb-1">
        <div className="w-8 h-8 rounded-t-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">🚗</div>
      </div>

      <div className="space-y-1.5">
        {layout.rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-1">
            {row.map((seat, colIdx) => {
              if (seat === null) {
                return <div key={colIdx} className="w-5" />
              }

              const isTaken = takenSeats.includes(seat)
              const isSelected = selectedSeat === seat

              return (
                <button
                  key={colIdx}
                  disabled={isTaken || readOnly}
                  onClick={() => !isTaken && !readOnly && onSelectSeat(seat)}
                  className={cn(
                    'w-8 h-8 rounded text-xs font-medium transition-all border',
                    isTaken
                      ? 'bg-gray-400 border-gray-400 text-white cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary border-primary text-white scale-105 shadow-sm'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-primary/40 hover:bg-surface-rose cursor-pointer'
                  )}
                  title={isTaken ? `Seat ${seat} — Booked` : `Seat ${seat}`}
                >
                  {seat}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selectedSeat && (
        <p className="text-center text-sm text-primary font-medium mt-3">Seat {selectedSeat} selected</p>
      )}
    </div>
  )
}
