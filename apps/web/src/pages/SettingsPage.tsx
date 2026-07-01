import { Settings, Palette, Check } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useThemeStore, THEMES } from '../stores/themeStore';

export function SettingsPage() {
  const tenant = useTenant();
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Palette className="h-4 w-4" />
          Appearance
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Choose a color theme for your portal. Applies instantly and is remembered on this device.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {THEMES.map(t => (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              aria-pressed={theme === t.name}
              className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                theme === t.name
                  ? 'border-brand-600 bg-brand-50/60 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="relative flex h-10 w-16 overflow-hidden rounded-lg shadow-inner">
                <span className="h-full w-1/2" style={{ backgroundColor: t.swatch[0] }} />
                <span className="h-full w-1/2" style={{ backgroundColor: t.swatch[1] }} />
                {theme === t.name && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={`text-xs font-medium ${theme === t.name ? 'text-brand-800' : 'text-slate-600'}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
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
