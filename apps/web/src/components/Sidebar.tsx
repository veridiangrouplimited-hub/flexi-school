import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  NotebookPen,
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

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const hasHostel  = useFeatureFlag('hostel');
  const hasSports  = useFeatureFlag('sports');
  const hasFinance = useFeatureFlag('finance');
  const hasAlumni  = useFeatureFlag('alumni');
  const canWrite   = useWriteAccess();
  const { can }    = useAuthStore();
  const { name, branding, subTier } = useTenant();

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  show: true },
        { to: '/notices',    icon: BellRing,         label: 'Notices',    show: true },
      ],
    },
    {
      title: 'School',
      items: [
        { to: '/academics',  icon: BookOpen,      label: 'Academics',  show: true },
        { to: '/learning',   icon: NotebookPen,   label: 'Learning',   show: true },
        { to: '/attendance', icon: Users,         label: 'Attendance', show: true },
        { to: '/hostel',     icon: Building2,     label: 'Hostel',     show: hasHostel },
        { to: '/sports',     icon: Trophy,        label: 'Sports',     show: hasSports },
        { to: '/finance',    icon: Banknote,      label: 'Finance',    show: hasFinance && can('finance:read') },
        { to: '/alumni',     icon: GraduationCap, label: 'Alumni',     show: hasAlumni },
      ],
    },
    {
      title: 'System',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings', show: can('settings:read') },
      ],
    },
  ]
    .map(sec => ({ ...sec, items: sec.items.filter(i => i.show) }))
    .filter(sec => sec.items.length > 0);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      {/* School branding */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={name}
            className="h-9 w-9 rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {(subTier ?? '').toLowerCase()} plan
          </p>
        </div>
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
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {sections.map(sec => (
          <div key={sec.title} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {sec.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {sec.items.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-700" aria-hidden="true" />
                        )}
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-600'}`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-[10px] text-slate-400">
          Powered by <span className="font-semibold text-brand-700">FlexiSchool</span>
        </p>
      </div>
    </aside>
  );
}
