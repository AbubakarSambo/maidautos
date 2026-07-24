import apiClient from './client'

export const paystackApi = {
  initialize: (bookingId: string) =>
    apiClient.post(`/paystack/initialize/${bookingId}`).then((r) => r.data.data),
  verify: (reference: string) =>
    apiClient.get(`/paystack/verify/${reference}`).then((r) => r.data.data),
}
