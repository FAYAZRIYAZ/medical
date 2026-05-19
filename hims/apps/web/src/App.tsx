import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AppLayout } from '@/components/layout/AppLayout';
import { ROLES } from '@hims/shared';

// Lazy pages — auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const OtpLoginPage = lazy(() => import('@/pages/auth/OtpLoginPage').then((m) => ({ default: m.OtpLoginPage })));
const TwoFAPage = lazy(() => import('@/pages/auth/TwoFAPage').then((m) => ({ default: m.TwoFAPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));

// Lazy pages — app
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PatientsPage = lazy(() => import('@/pages/patients/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import('@/pages/patients/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })));
const NewPatientPage = lazy(() => import('@/pages/patients/NewPatientPage').then((m) => ({ default: m.NewPatientPage })));
const AppointmentsPage = lazy(() => import('@/pages/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const NewAppointmentPage = lazy(() => import('@/pages/appointments/NewAppointmentPage').then((m) => ({ default: m.NewAppointmentPage })));
const OpdQueuePage = lazy(() => import('@/pages/appointments/OpdQueuePage').then((m) => ({ default: m.OpdQueuePage })));
const IPDPage = lazy(() => import('@/pages/ipd/IPDPage').then((m) => ({ default: m.IPDPage })));
const IPDAdmissionDetailPage = lazy(() => import('@/pages/ipd/IPDAdmissionDetailPage').then((m) => ({ default: m.IPDAdmissionDetailPage })));
const WardManagementPage = lazy(() => import('@/pages/ipd/WardManagementPage').then((m) => ({ default: m.WardManagementPage })));
const PharmacyPage = lazy(() => import('@/pages/pharmacy/PharmacyPage').then((m) => ({ default: m.PharmacyPage })));
const LabPage = lazy(() => import('@/pages/lab/LabPage').then((m) => ({ default: m.LabPage })));
const LabOrderDetailPage = lazy(() => import('@/pages/lab/LabOrderDetailPage').then((m) => ({ default: m.LabOrderDetailPage })));
const BillingPage = lazy(() => import('@/pages/billing/BillingPage').then((m) => ({ default: m.BillingPage })));
const InvoiceDetailPage = lazy(() => import('@/pages/billing/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })));
const NewInvoicePage = lazy(() => import('@/pages/billing/NewInvoicePage').then((m) => ({ default: m.NewInvoicePage })));
const TelemedicineListPage = lazy(() => import('@/pages/telemedicine/TelemedicineListPage').then((m) => ({ default: m.TelemedicineListPage })));
const TelemedicinePage = lazy(() => import('@/pages/telemedicine/TelemedicinePage').then((m) => ({ default: m.TelemedicinePage })));
const EncountersPage = lazy(() => import('@/pages/encounters/EncountersPage').then((m) => ({ default: m.EncountersPage })));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage').then((m) => ({ default: m.ChatPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// Public pages
const LandingPage = lazy(() => import('@/pages/public/LandingPage').then((m) => ({ default: m.LandingPage })));

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-medical-blue border-t-transparent" />
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GuestRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth (guest only) */}
        <Route element={<GuestRoute />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/login-otp" element={<OtpLoginPage />} />
          <Route path="/auth/2fa" element={<TwoFAPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected app */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Patients */}
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<NewPatientPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />

            {/* Appointments */}
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/new" element={<NewAppointmentPage />} />
            <Route path="/appointments/queue" element={<OpdQueuePage />} />

            {/* IPD */}
            <Route path="/ipd" element={<IPDPage />} />
            <Route path="/ipd/:id" element={<IPDAdmissionDetailPage />} />
            <Route
              path="/ipd/wards"
              element={
                <RoleRoute roles={[ROLES.HOSPITAL_ADMIN, ROLES.NURSE, ROLES.DOCTOR]}>
                  <WardManagementPage />
                </RoleRoute>
              }
            />

            {/* Pharmacy */}
            <Route path="/pharmacy" element={<PharmacyPage />} />

            {/* Lab */}
            <Route path="/lab" element={<LabPage />} />
            <Route path="/lab/:id" element={<LabOrderDetailPage />} />

            {/* Billing */}
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/new" element={<NewInvoicePage />} />
            <Route path="/billing/:id" element={<InvoiceDetailPage />} />

            {/* Encounters / Consultations */}
            <Route path="/encounters" element={<EncountersPage />} />

            {/* Telemedicine */}
            <Route path="/telemedicine" element={<TelemedicineListPage />} />
            <Route path="/telemedicine/:appointmentId" element={<TelemedicinePage />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Chat */}
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:roomId" element={<ChatPage />} />

            {/* Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
