export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PASSENGER'
export type CarType = 'SEDAN' | 'SIENA' | 'HIACE' | 'COASTER' | 'BUS'
export type CarStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY'
export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED'
export type PaymentMethod = 'PAYSTACK' | 'CASH'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED'

export interface User {
  id: string
  email: string | null
  phone: string | null
  firstName: string
  lastName: string
  role: UserRole
  adminCity: string | null
  isEmailVerified: boolean
  isGuest?: boolean
}

export interface Stop {
  id: string
  name: string
  state: string
  slug: string
}

export interface RouteStop {
  id: string
  routeId: string
  stopId: string
  order: number
  distanceFromOriginKm: number
  priceFromOrigin: number
  stop: Stop
}

export interface Route {
  id: string
  originStopId: string
  destinationStopId: string
  estimatedDurationMinutes: number
  isActive: boolean
  originStop: Stop
  destinationStop: Stop
  routeStops: RouteStop[]
}

export interface Car {
  id: string
  plateNumber: string
  make: string
  model: string
  year: number
  type: CarType
  capacity: number
  hasAC: boolean
  status: CarStatus
  photos: string[]
  notes: string | null
}

export interface Driver {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  licenseNumber: string
  licenseExpiry: string
  nin: string | null
  photo: string | null
  status: DriverStatus
  isActive: boolean
  notes: string | null
}

export interface TripStatusUpdate {
  id: string
  tripId: string
  stopId: string | null
  checkpointLabel: string
  note: string | null
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string }
  stop?: Stop
}

export interface Trip {
  id: string
  routeId: string
  carId: string
  driverId: string
  departureDateTime: string
  status: TripStatus
  priceOverride: number | null
  notes: string | null
  route: Route
  car: Car
  driver: Driver
  statusUpdates: TripStatusUpdate[]
  bookings?: Array<{ seatNumber: number; pickupStopId: string; dropoffStopId: string }>
  _count?: { bookings: number }
}

export interface Booking {
  id: string
  tripId: string
  userId: string | null
  guestName: string | null
  guestEmail: string | null
  guestPhone: string | null
  nokName: string | null
  nokPhone: string | null
  seatNumber: number
  pickupStopId: string
  dropoffStopId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paystackReference: string | null
  paymentUrl: string | null
  ticketCode: string
  status: BookingStatus
  bookedByAdminId: string | null
  createdAt: string
  trip: Trip
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'> | null
  bookedByAdmin: Pick<User, 'id' | 'firstName' | 'lastName'> | null
  pickupStop: RouteStop
  dropoffStop: RouteStop
}

export interface SeatAvailability {
  total: number
  available: number[]
  taken: number[]
}

// Seat layout config per car type
export interface SeatLayout {
  rows: Array<Array<number | null | 'driver'>> // null = aisle, 'driver' = non-bookable driver seat
}
