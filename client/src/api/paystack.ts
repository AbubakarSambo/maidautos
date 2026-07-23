import apiClient from './client'

export const paystackApi = {
  initialize: (bookingId: string) =>
    apiClient.post(`/paystack/initialize/${bookingId}`).then((r) => r.data.data),
}
