import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CarType, SeatLayout, RouteStop, Trip } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mirrors the pricing logic in api's bookings.service.ts create(): the listed segment
// fare (stop-to-stop, from route pricing), scaled by the trip's priceOverride if set —
// e.g. a route-wide override to 60% of the listed full-route price makes every segment
// 60% too, so relative stop-to-stop pricing stays consistent.
export function getSegmentFare(trip: Trip, pickupStop: RouteStop, dropoffStop: RouteStop): number {
  let fare = Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin)
  if (trip.priceOverride != null) {
    const stops = trip.route.routeStops
    const first = stops[0]
    const last = stops[stops.length - 1]
    const fullRouteFare = Number(last.priceFromOrigin) - Number(first.priceFromOrigin)
    if (fullRouteFare > 0) fare = fare * (trip.priceOverride / fullRouteFare)
  }
  return fare
}

export function formatCurrency(amount: number | string) {
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

// Always rendered in Nigeria time (WAT) regardless of the viewer's own device
// timezone — this is a Nigeria-only service, so a trip at "8am" should read as 8am
// whether the person looking at it is in Lagos or, say, London.
const NG_TIMEZONE = 'Africa/Lagos'

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: NG_TIMEZONE })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: NG_TIMEZONE })
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
    case 'SEDAN': {
      // A sedan has exactly one front passenger seat (the other front spot is the
      // driver's). Everything else fills back rows of 3. capacity=4 -> 1 front, 3 back.
      const rows: Array<Array<number | null>> = []
      let seat = 1
      if (capacity >= 1) rows.push([seat++])
      while (seat <= capacity) {
        const row: Array<number | null> = []
        for (let i = 0; i < 3; i++) row.push(seat <= capacity ? seat++ : null)
        rows.push(row)
      }
      return { rows }
    }

    case 'SIENA': {
      // Toyota Sienna typical layout varies by capacity
      // 6-seat: driver front-left (not bookable), 1 front-right, 2 middle, 3 back
      if (capacity <= 6) return { rows: [['driver', null, 1], [2, null, 3], [4, 5, 6]] }
      // 7-seat: driver + 1 front, 3 middle, 3 back
      if (capacity === 7) return { rows: [['driver', null, 1], [2, 3, 4], [5, 6, 7]] }
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
