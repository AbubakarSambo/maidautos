import apiClient from './client'

export const carsApi = {
  findAll: () => apiClient.get('/cars').then((r) => r.data.data),
  findActive: () => apiClient.get('/cars/active').then((r) => r.data.data),
  findOne: (id: string) => apiClient.get(`/cars/${id}`).then((r) => r.data.data),
  create: (data: any) => apiClient.post('/cars', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.patch(`/cars/${id}`, data).then((r) => r.data.data),
  updateStatus: (id: string, status: string) => apiClient.patch(`/cars/${id}/status`, { status }).then((r) => r.data.data),
}
