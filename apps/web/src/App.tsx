import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export function App() {
  const { token, setSession, clear } = useAuthStore();
  const { tenant, setTenant }        = useTenantStore();
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

  const authenticated = !!token && !!tenant;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              authenticated
                ? <Navigate to="/dashboard" replace />
                : <LoginPage />
            }
          />

          {authenticated && tenant ? (
            <Route element={<TenantProvider tenant={tenant}><AppShell /></TenantProvider>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/academics"  element={<AcademicsPage />} />
              <Route path="/hostel"     element={<HostelPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/sports"     element={<SportsPage />} />
              <Route path="/finance"    element={<FinancePage />} />
              <Route path="/alumni"     element={<AlumniPage />} />
              <Route path="/notices"    element={<NoticesPage />} />
              <Route path="/settings"   element={<SettingsPage />} />
            </Route>
          ) : null}

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
