import { Settings } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function SettingsPage() {
  const tenant = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Tenant Info</h3>
        <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
          <Row label="School name"   value={tenant.name} />
          <Row label="Level"         value={tenant.level.replace('_', ' ')} />
          <Row label="Boarding type" value={tenant.boardingType.replace(/_/g, ' ')} />
          <Row label="Subscription"  value={`${tenant.subStatus}`} highlight={tenant.subStatus !== 'ACTIVE'} />
          <Row label="Tenant ID"     value={tenant.id} mono />
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Active Feature Flags</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tenant.flags).map(([key, val]) => (
            <span
              key={key}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium',
                val ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {key}: {val ? 'on' : 'off'}
            </span>
          ))}
        </div>
      </div>

      {tenant.branding.schoolMotto && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">School Motto</h3>
          <p className="font-display text-lg text-slate-600 italic">"{tenant.branding.schoolMotto}"</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={['mt-0.5 text-sm font-medium', mono ? 'font-mono' : '', highlight ? 'text-amber-600' : 'text-slate-800'].join(' ')}>
        {value}
      </dd>
    </div>
  );
}
