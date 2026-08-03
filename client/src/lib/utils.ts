import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CarType, SeatLayout } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

// Returns a 2D grid of seat numbers for visual display.
// null in a row = aisle gap.
// Row 0 = frontmost passenger row.
export function getSeatLayout(carType: CarType, capacity: number): SeatLayout {
  switch (carType) {
    case 'SEDAN':
      // 2 rows: [1,null,2] (front), [3,4,5] (back row of 3)
      return { rows: [[1, null, 2], [3, 4, 5]] }

    case 'SIENA': {
      // Toyota Sienna typical layout varies by capacity
      // 6-seat: driver front-left (not bookable), 1 front-right, 2 middle, 3 back
      if (capacity <= 6) return { rows: [['driver', null, 1], [2, null, 3], [4, 5, 6]] }
      if (capacity === 7) return { rows: [['driver', null, 1], [2, null, 3], [4, 5, 6], [7, null, null]] }
      // 8-seat: driver + 1 front, 2 middle, 2 middle, 3 back
      return { rows: [['driver', null, 1], [2, null, 3], [4, null, 5], [6, 7, 8]] }
    }

    case 'HIACE': {
      // 14-seater: 2 + 3+3+3+3
      const rows: Array<Array<number | null>> = []
      let seat = 1
      rows.push([seat++, null, seat++]) // front row: 2 seats
      while (seat <= capacity) {
        const row: Array<number | null> = []
        row.push(seat <= capacity ? seat++ : null)
        row.push(seat <= capacity ? seat++ : null)
        row.push(null) // aisle
        row.push(seat <= capacity ? seat++ : null)
        rows.push(row)
      }
      return { rows }
    }

    case 'COASTER':
    case 'BUS':
    default: {
      // 2+2 per row
      const rows: Array<Array<number | null>> = []
      let seat = 1
      while (seat <= capacity) {
        const row: Array<number | null> = []
        row.push(seat <= capacity ? seat++ : null)
        row.push(seat <= capacity ? seat++ : null)
        row.push(null) // aisle
        row.push(seat <= capacity ? seat++ : null)
        row.push(seat <= capacity ? seat++ : null)
        rows.push(row)
      }
      return { rows }
    }
  }
}

export function getWhatsAppShareUrl(ticketCode: string, from: string, to: string, departure: string, seat: number) {
  const text = encodeURIComponent(
    `🚌 MaidAutos Ticket\nTicket: ${ticketCode}\nRoute: ${from} → ${to}\nDeparture: ${departure}\nSeat: ${seat}\n\nBook your ride at maidautos.com`
  )
  return `https://wa.me/?text=${text}`
}
