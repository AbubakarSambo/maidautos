import apiClient from './client'

export const routesApi = {
  findAll: () => apiClient.get('/routes').then((r) => r.data.data),
  findOne: (id: string) => apiClient.get(`/routes/${id}`).then((r) => r.data.data),
  create: (data: any) => apiClient.post('/routes', data).then((r) => r.data.data),
  toggleActive: (id: string) => apiClient.patch(`/routes/${id}/toggle`).then((r) => r.data.data),
  updateStop: (routeStopId: string, data: { priceFromOrigin?: number; distanceFromOriginKm?: number }) =>
    apiClient.patch(`/routes/stops/${routeStopId}`, data).then((r) => r.data.data),
}
