import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from '@/pages/auth'
import { DashboardPage } from '@/pages/DashboardPage'
import { TrackersPage } from '@/pages/TrackersPage'
import { FranchisesPage } from '@/pages/FranchisesPage'
import { MyTrackersPage } from '@/pages/MyTrackersPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { PendingApprovalPage } from '@/pages/PendingApprovalPage'
import { BlockedUserPage } from '@/pages/BlockedUserPage'
import { UsersPage } from '@/pages/UsersPage'

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
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/blocked" element={<BlockedUserPage />} />

            {/* Protected Routes - All Users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Admin & Matriz */}
            <Route
              path="/trackers"
              element={
                <ProtectedRoute allowedRoles={['admin', 'matriz']}>
                  <Layout>
                    <TrackersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/franchises"
              element={
                <ProtectedRoute allowedRoles={['admin', 'matriz']}>
                  <Layout>
                    <FranchisesPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipments"
              element={
                <ProtectedRoute allowedRoles={['admin', 'matriz']}>
                  <Layout>
                    <TrackersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Admin Only */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <UsersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="text-center py-12">
                      <h1 className="text-2xl font-bold">Configurações</h1>
                      <p className="text-muted-foreground">Em desenvolvimento...</p>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Franqueado */}
            <Route
              path="/my-trackers"
              element={
                <ProtectedRoute allowedRoles={['franqueado']}>
                  <Layout>
                    <MyTrackersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
