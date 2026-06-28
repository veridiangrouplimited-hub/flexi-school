import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '../../stores/authStore';
import { useTenantStore } from '../../stores/tenantStore';
import { useTenant } from '../../context/TenantContext';

export function AppShell() {
  const { role, clear } = useAuthStore();
  const setTenant       = useTenantStore((s) => s.setTenant);
  const { name }        = useTenant();

  function handleLogout() {
    clear();
    setTenant(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-semibold text-slate-700">{name}</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {role?.replace(/_/g, ' ')}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
