import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './context/TenantContext';
import { useAuthStore } from './stores/authStore';
import { useTenantStore } from './stores/tenantStore';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { HostelPage } from './pages/HostelPage';
import { AttendancePage } from './pages/AttendancePage';
import { SportsPage } from './pages/SportsPage';
import { FinancePage } from './pages/FinancePage';
import { AlumniPage } from './pages/AlumniPage';
import { NoticesPage } from './pages/NoticesPage';
import { SettingsPage } from './pages/SettingsPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentCancelPage } from './pages/PaymentCancelPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Wraps protected routes — redirects to /login if not authenticated
function ProtectedLayout() {
  const token  = useAuthStore((s) => s.token);
  const tenant = useTenantStore((s) => s.tenant);

  if (!token || !tenant) return <Navigate to="/login" replace />;

  return (
    <TenantProvider tenant={tenant}>
      <AppShell />
    </TenantProvider>
  );
}

export function App() {
  const { token, setSession, clear } = useAuthStore();
  const { setTenant }                = useTenantStore();
  const [booting, setBooting]        = useState(true);

  // On mount: if a token is persisted, rehydrate user + tenant from /auth/me
  useEffect(() => {
    if (!token) { setBooting(false); return; }

    fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ user, tenant: t }) => {
        setSession({
          userId:      user.id,
          role:        user.role,
          permissions: user.permissions,
          tenantId:    user.tenantId,
          token,
        });
        setTenant(t);
      })
      .catch(() => { clear(); setTenant(null); })
      .finally(() => setBooting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgb(15 23 42 / 0.12)',
            border: '1px solid #e2e8f0',
          },
          success: { iconTheme: { primary: '#15803d', secondary: '#ffffff' } },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — ProtectedLayout handles the auth gate */}
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/academics"  element={<AcademicsPage />} />
            <Route path="/hostel"     element={<HostelPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/sports"     element={<SportsPage />} />
            <Route path="/finance"                   element={<FinancePage />} />
            <Route path="/finance/payment/success"  element={<PaymentSuccessPage />} />
            <Route path="/finance/payment/cancel"   element={<PaymentCancelPage />} />
            <Route path="/alumni"     element={<AlumniPage />} />
            <Route path="/notices"    element={<NoticesPage />} />
            <Route path="/settings"   element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
