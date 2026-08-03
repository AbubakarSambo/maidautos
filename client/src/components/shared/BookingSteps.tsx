import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Select Seat', 'Checkout', 'Confirmation']

export function BookingSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center max-w-lg mx-auto px-4 pt-4">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                  done ? 'bg-primary text-white' : active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
                  active ? 'text-primary' : done ? 'text-on-surface-variant' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-2 -mt-4', i < current ? 'bg-primary' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
