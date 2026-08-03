import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string; disabled?: boolean }

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  chevronClassName?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled,
  className,
  chevronClassName,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        <span className={cn('truncate', !selected && 'text-gray-muted font-normal')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-gray-muted transition-transform', open && 'rotate-180', chevronClassName)} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 left-0 w-full max-h-60 overflow-auto rounded-xl border border-outline-variant bg-surface shadow-lg py-1"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                if (opt.disabled) return
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer',
                opt.disabled
                  ? 'text-gray-muted cursor-not-allowed'
                  : opt.value === value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-rose'
              )}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
