import apiClient from './client'

export const tripsApi = {
  search: (from: string, to: string, date: string) =>
    apiClient.get('/trips/search', { params: { from, to, date } }).then((r) => r.data.data),

  findAll: (params?: { status?: string; date?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get('/trips', { params }).then((r) => r.data.data),

  findOne: (id: string) =>
    apiClient.get(`/trips/${id}`).then((r) => r.data.data),

  getAvailableSeats: (tripId: string, pickupStopId: string, dropoffStopId: string) =>
    apiClient.get(`/trips/${tripId}/available-seats`, { params: { pickup: pickupStopId, dropoff: dropoffStopId } }).then((r) => r.data.data),

  create: (data: any) =>
    apiClient.post('/trips', data).then((r) => r.data.data),

  createBulk: (data: any) =>
    apiClient.post('/trips/bulk', data).then((r) => r.data.data),

  update: (id: string, data: any) =>
    apiClient.patch(`/trips/${id}`, data).then((r) => r.data.data),

  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/trips/${id}/status`, { status }).then((r) => r.data.data),

  addStatusUpdate: (tripId: string, data: { checkpointLabel: string; stopId?: string; note?: string }) =>
    apiClient.post(`/trips/${tripId}/status-updates`, data).then((r) => r.data.data),
}
