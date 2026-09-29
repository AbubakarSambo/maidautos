import apiClient from './client'

export const contactApi = {
  send: (data: { name: string; email: string; subject?: string; message: string; company?: string }) =>
    apiClient.post('/contact', data).then((r) => r.data.data),
}
