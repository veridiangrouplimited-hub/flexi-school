import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, BookOpen, Building2, Users } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';

interface Session { id: string; name: string; isCurrent: boolean; startDate: string | null; endDate: string | null; }

export function DashboardPage() {
  const { name, subStatus, subTier, boardingType, flags } = useTenant();

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn:  () => api.get('/api/academic/sessions'),
  });

  const current = sessions.find((s) => s.isCurrent) ?? sessions[0];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {current ? `Active session: ${current.name}` : 'No active session configured.'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="School"    value={name} />
        <StatCard icon={Calendar}  label="Session"   value={current?.name ?? '—'} />
        <StatCard icon={BookOpen}  label="Plan"      value={(subTier ?? '—').replace(/_/g, ' ')} />
        <StatCard
          icon={Users}
          label="Status"
          value={subStatus}
          highlight={subStatus !== 'ACTIVE'}
        />
      </div>

      {/* Quick links */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Modules</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <ModuleChip label="Academics" href="/academics" enabled />
          <ModuleChip label="Hostel"    href="/hostel"    enabled={flags.hostel} />
          <ModuleChip label="Sports"    href="/sports"    enabled={flags.sports} />
          <ModuleChip label="Finance"   href="/finance"   enabled={flags.finance} />
          <ModuleChip label="Alumni"    href="/alumni"    enabled={flags.alumni} />
          <ModuleChip label="Notices"   href="/notices"   enabled />
          <ModuleChip label="Settings"  href="/settings"  enabled />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, highlight = false,
}: { icon: React.ElementType; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function ModuleChip({ label, href, enabled }: { label: string; href: string; enabled: boolean }) {
  const cls = [
    'flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
    enabled
      ? 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'
      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed pointer-events-none',
  ].join(' ');

  if (!enabled) {
    return (
      <div className={cls}>
        {label}
        <span className="text-xs font-normal">locked</span>
      </div>
    );
  }

  return (
    <Link to={href} className={cls}>
      {label}
    </Link>
  );
}
