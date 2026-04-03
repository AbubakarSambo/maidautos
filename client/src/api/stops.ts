import apiClient from './client'

export const stopsApi = {
  findAll: () => apiClient.get('/stops').then((r) => r.data.data),
  findOne: (id: string) => apiClient.get(`/stops/${id}`).then((r) => r.data.data),
  create: (data: { name: string; state: string }) => apiClient.post('/stops', data).then((r) => r.data.data),
  update: (id: string, data: Partial<{ name: string; state: string }>) => apiClient.patch(`/stops/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/stops/${id}`).then((r) => r.data.data),
}
