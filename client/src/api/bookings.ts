import apiClient from './client'

export const bookingsApi = {
  findAll: (params?: { tripId?: string; userId?: string; status?: string }) =>
    apiClient.get('/bookings', { params }).then((r) => r.data.data),

  findMine: () =>
    apiClient.get('/bookings/my').then((r) => r.data.data),

  findByTicketCode: (code: string) =>
    apiClient.get(`/bookings/ticket/${code}`).then((r) => r.data.data),

  findOne: (id: string) =>
    apiClient.get(`/bookings/${id}`).then((r) => r.data.data),

  create: (data: {
    tripId: string
    seatNumber: number
    pickupStopId: string
    dropoffStopId: string
    paymentMethod: 'PAYSTACK' | 'CASH'
    guestName?: string
    guestEmail?: string
    guestPhone?: string
    passengerUserId?: string
  }) => apiClient.post('/bookings', data).then((r) => r.data.data),

  cancel: (id: string) =>
    apiClient.patch(`/bookings/${id}/cancel`).then((r) => r.data.data),

  recordCashPayment: (id: string) =>
    apiClient.patch(`/bookings/${id}/record-payment`).then((r) => r.data.data),
}
