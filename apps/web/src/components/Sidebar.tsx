import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  Trophy,
  Banknote,
  BellRing,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { useFeatureFlag, useWriteAccess } from '../hooks/useFeatureFlags';
import { useAuthStore } from '../stores/authStore';
import { useTenant } from '../context/TenantContext';

interface NavItem {
  to:    string;
  icon:  React.ElementType;
  label: string;
  show:  boolean;
}

export function Sidebar() {
  const hasHostel  = useFeatureFlag('hostel');
  const hasSports  = useFeatureFlag('sports');
  const hasFinance = useFeatureFlag('finance');
  const hasAlumni  = useFeatureFlag('alumni');
  const canWrite   = useWriteAccess();
  const { can }    = useAuthStore();
  const { name, branding } = useTenant();

  const navItems: NavItem[] = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  show: true },
    { to: '/academics',  icon: BookOpen,         label: 'Academics',  show: true },
    { to: '/attendance', icon: Users,            label: 'Attendance', show: true },
    { to: '/hostel',     icon: Building2,        label: 'Hostel',     show: hasHostel },
    { to: '/sports',     icon: Trophy,           label: 'Sports',     show: hasSports },
    { to: '/finance',    icon: Banknote,         label: 'Finance',    show: hasFinance && can('finance:read') },
    { to: '/alumni',     icon: GraduationCap,    label: 'Alumni',     show: hasAlumni },
    { to: '/notices',    icon: BellRing,         label: 'Notices',    show: true },
    { to: '/settings',   icon: Settings,         label: 'Settings',   show: can('settings:read') },
  ].filter((item) => item.show);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      {/* School branding */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: branding.primaryColor ?? '#15803d' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-sm font-semibold text-slate-800">
          {name}
        </span>
      </div>

      {/* Subscription warning banner */}
      {!canWrite && (
        <div className="mx-3 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          data-testid="readonly-banner"
        >
          Read-only — subscription past due
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
