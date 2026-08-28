import apiClient, { API_BASE_URL } from './client'

// A full page navigation, not an XHR call — the backend redirects the browser to
// Google's consent screen and back, so this can't go through axios.
export const googleLoginUrl = `${API_BASE_URL}/auth/google`

export const authApi = {
  register: (data: { firstName: string; lastName: string; email: string; phone?: string; password: string }) =>
    apiClient.post('/auth/register', data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data.data),

  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }).then((r) => r.data.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data.data),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post('/auth/reset-password', data).then((r) => r.data.data),

  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data.data),

  getProfile: () =>
    apiClient.get('/auth/me').then((r) => r.data.data),

  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    apiClient.patch('/auth/me', data).then((r) => r.data.data),
}
