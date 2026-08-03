import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout'
import { ProtectedRoute, GuestRoute } from '@/components/shared'
import {
  SearchPage,
  RoutesPage,
  TermsPage,
  PrivacyPage,
  TripDetailPage,
  CheckoutPage,
  ConfirmationPage,
  PaymentCallbackPage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  CheckEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  MyBookingsPage,
  AdminDashboardPage,
  AdminTripsPage,
  AdminTripDetailPage,
  AdminBookingsPage,
  AdminCarsPage,
  AdminDriversPage,
  AdminRoutesPage,
  AdminStopsPage,
  AdminUsersPage,
  AdminNewTripPage,
  AdminNewBookingPage,
} from '@/pages'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public passenger-facing */}
          <Route path="/" element={<SearchPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
          <Route path="/booking/checkout" element={<CheckoutPage />} />
          <Route path="/booking/confirmation/:ticketCode" element={<ConfirmationPage />} />
          <Route path="/booking/callback" element={<PaymentCallbackPage />} />

          {/* Auth */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Passenger account */}
          <Route element={<ProtectedRoute allowedRoles={['PASSENGER']} />}>
            <Route path="/account/bookings" element={<MyBookingsPage />} />
          </Route>

          {/* Admin — shared layout */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/trips" element={<AdminTripsPage />} />
              <Route path="/admin/trips/new" element={<AdminNewTripPage />} />
              <Route path="/admin/trips/:id" element={<AdminTripDetailPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/bookings/new" element={<AdminNewBookingPage />} />
              <Route path="/admin/routes" element={<AdminRoutesPage />} />
              <Route path="/admin/stops" element={<AdminStopsPage />} />
              <Route path="/admin/cars" element={<AdminCarsPage />} />
              <Route path="/admin/drivers" element={<AdminDriversPage />} />

              {/* Super admin only */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  )
}

export default App
