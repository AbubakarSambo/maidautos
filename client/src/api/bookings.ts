import apiClient from './client'

export const bookingsApi = {
  findAll: (params?: { tripId?: string; userId?: string; status?: string }) =>
    apiClient.get('/bookings', { params }).then((r) => r.data.data),

  findMine: () =>
    apiClient.get('/bookings/my').then((r) => r.data.data),

  findByTicketCode: (code: string) =>
    apiClient.get(`/bookings/ticket/${code}`).then((r) => r.data.data),

  findByGroupId: (groupId: string) =>
    apiClient.get(`/bookings/group/${groupId}`).then((r) => r.data.data),

  findOne: (id: string) =>
    apiClient.get(`/bookings/${id}`).then((r) => r.data.data),

  create: (data: {
    tripId: string
    pickupStopId: string
    dropoffStopId: string
    paymentMethod: 'PAYSTACK' | 'CASH'
    passengers: {
      seatNumber: number
      guestName?: string
      guestEmail?: string
      guestPhone?: string
      nokName?: string
      nokPhone?: string
      passengerUserId?: string
    }[]
  }) => apiClient.post('/bookings', data).then((r) => r.data.data),

  // Self-service management: contact (email/phone) is required unless logged in as the owner.
  manageLookup: (data: { ticketCode: string; contact?: string }): Promise<import('@/types').ManageBookingResult> =>
    apiClient.post('/bookings/manage/lookup', data).then((r) => r.data.data),

  manageQuote: (data: { ticketCode: string; contact?: string; tripId: string; seatNumber: number }): Promise<import('@/types').BookingChangeQuote> =>
    apiClient.post('/bookings/manage/quote', data).then((r) => r.data.data),

  manageChange: (data: { ticketCode: string; contact?: string; tripId: string; seatNumber: number }): Promise<import('@/types').BookingChangeQuote & { groupId: string; bookingId: string }> =>
    apiClient.post('/bookings/manage/change', data).then((r) => r.data.data),

  cancel: (id: string) =>
    apiClient.patch(`/bookings/${id}/cancel`).then((r) => r.data.data),

  // Admin: cancel this booking and issue a new cash-paid ticket for the same seat to someone else.
  reassign: (
    id: string,
    data: { guestName: string; guestEmail?: string; guestPhone?: string; nokName?: string; nokPhone?: string; amount?: number },
  ) => apiClient.patch(`/bookings/${id}/reassign`, data).then((r) => r.data.data),

  // Admin: clear the paid-without-seat flag once the customer has been rebooked or refunded.
  resolvePaidWithoutSeat: (id: string) =>
    apiClient.patch(`/bookings/${id}/resolve-paid-without-seat`).then((r) => r.data.data),

  recordCashPayment: (id: string) =>
    apiClient.patch(`/bookings/${id}/record-payment`).then((r) => r.data.data),

  reVerifyPayment: (id: string) =>
    apiClient.post(`/paystack/re-verify/${id}`).then((r) => r.data.data),
}
