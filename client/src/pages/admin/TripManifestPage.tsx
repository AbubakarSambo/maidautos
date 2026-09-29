import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { tripsApi, bookingsApi } from '@/api'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { Trip, Booking } from '@/types'

export function AdminTripManifestPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: trip } = useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.findOne(id!),
    enabled: !!id,
  })

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ['bookings', { tripId: id }],
    queryFn: () => bookingsApi.findAll({ tripId: id }),
    enabled: !!id,
  })

  const passengers = allBookings
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) => a.seatNumber - b.seatNumber)

  const totalRevenue = passengers.reduce((sum, b) => sum + Number(b.amount), 0)

  if (!trip) return <div className="flex items-center justify-center py-16 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style>{`@media print { @page { size: A4; margin: 12mm } }`}</style>

      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => navigate(`/admin/trips/${id}`)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to trip
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-gray-100 print:border-0 p-8 print:p-0">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-900">
            <img src="/logo.png" alt="MaidAutos" className="h-10 w-auto" />
            <div>
              <p className="font-extrabold text-lg text-gray-900 leading-tight">MAID AUTOS LIMITED</p>
              <p className="text-xs text-gray-500">Passenger Manifest</p>
            </div>
          </div>

          {/* Trip details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-4 border-b border-gray-200">
            <ManifestField label="Route" value={`${trip.route.originStop.name} → ${trip.route.destinationStop.name}`} />
            <ManifestField label="Departure" value={formatDateTime(trip.departureDateTime)} />
            <ManifestField label="Vehicle" value={`${trip.car.make} ${trip.car.model} — ${trip.car.plateNumber}`} />
            <ManifestField label="Driver" value={`${trip.driver.firstName} ${trip.driver.lastName} · ${trip.driver.phone}`} />
            <ManifestField label="Driver's License No." value={trip.driver.licenseNumber} />
            <ManifestField label="Total Passengers" value={String(passengers.length)} />
          </div>

          {/* Passenger table */}
          <table className="w-full text-sm mt-4 border-collapse">
            <thead>
              <tr className="text-left border-b-2 border-gray-900">
                <th className="py-2 pr-2 font-bold text-gray-900">Seat</th>
                <th className="py-2 pr-2 font-bold text-gray-900">Name</th>
                <th className="py-2 pr-2 font-bold text-gray-900">Phone</th>
                <th className="py-2 pr-2 font-bold text-gray-900">Next of Kin</th>
                <th className="py-2 pr-2 font-bold text-gray-900">Pickup</th>
                <th className="py-2 pr-2 font-bold text-gray-900">Dropoff</th>
                <th className="py-2 pl-2 font-bold text-gray-900 text-right">Payment</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((b) => {
                const name = b.user ? `${b.user.firstName} ${b.user.lastName}` : b.guestName || '—'
                const phone = b.user?.phone || b.guestPhone || '—'
                const nok = [b.nokName, b.nokPhone].filter(Boolean).join(' · ') || '—'
                return (
                  <tr key={b.id} className="border-b border-gray-200 break-inside-avoid">
                    <td className="py-2 pr-2 font-bold text-primary">{b.seatNumber}</td>
                    <td className="py-2 pr-2">{name}</td>
                    <td className="py-2 pr-2">{phone}</td>
                    <td className="py-2 pr-2">{nok}</td>
                    <td className="py-2 pr-2">{b.pickupStop.stop.name}</td>
                    <td className="py-2 pr-2">{b.dropoffStop.stop.name}</td>
                    <td className="py-2 pl-2 text-right">
                      {b.paymentStatus === 'PAID' ? 'Paid' : b.paymentStatus === 'PENDING' ? 'Pending' : b.paymentStatus}
                    </td>
                  </tr>
                )
              })}
              {passengers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">No passengers on this trip.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-gray-900 text-sm font-bold">
            <span>Total Passengers: {passengers.length}</span>
            <span>Total Revenue: {formatCurrency(totalRevenue)}</span>
          </div>

          {/* Signature */}
          <div className="mt-12 flex justify-between text-sm">
            <div className="w-56">
              <div className="border-t border-gray-400 pt-1">Driver's Signature</div>
            </div>
            <div className="w-56">
              <div className="border-t border-gray-400 pt-1">Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManifestField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 font-semibold">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
