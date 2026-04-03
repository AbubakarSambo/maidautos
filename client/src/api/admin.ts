import apiClient from './client'

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard').then((r) => r.data.data),
  getRevenueByRoute: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get('/admin/reports/revenue-by-route', { params }).then((r) => r.data.data),
}
