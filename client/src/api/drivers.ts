import apiClient from './client'

export const driversApi = {
  findAll: () => apiClient.get('/drivers').then((r) => r.data.data),
  findAvailable: () => apiClient.get('/drivers/available').then((r) => r.data.data),
  findOne: (id: string) => apiClient.get(`/drivers/${id}`).then((r) => r.data.data),
  create: (data: any) => apiClient.post('/drivers', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.patch(`/drivers/${id}`, data).then((r) => r.data.data),
  toggleActive: (id: string) => apiClient.patch(`/drivers/${id}/toggle`).then((r) => r.data.data),
}
