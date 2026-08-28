import apiClient from './client'

export const paystackApi = {
  initialize: (groupId: string) =>
    apiClient.post(`/paystack/initialize/${groupId}`).then((r) => r.data.data),
  verify: (reference: string) =>
    apiClient.get(`/paystack/verify/${reference}`).then((r) => r.data.data),
}
