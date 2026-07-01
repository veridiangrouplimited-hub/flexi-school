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

  const roleLabel = role?.replace(/_/g, ' ') ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Keyboard users can jump straight to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
          <h1 className="text-sm font-semibold text-slate-700">{name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[10px] font-bold text-white">
                {roleLabel.charAt(0)}
              </span>
              <span className="text-xs font-medium capitalize text-slate-600">
                {roleLabel.toLowerCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
