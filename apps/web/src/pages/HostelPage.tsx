import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api } from '../lib/api';

interface Bed {
  id: string;
  roomNumber: string;
  bedNumber: string;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
}
interface Dormitory {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  capacity: number;
  beds: Bed[];
}

export function HostelPage() {
  const { data: dorms = [], isLoading } = useQuery<Dormitory[]>({
    queryKey: ['dormitories'],
    queryFn:  () => api.get('/api/hostel/dormitories'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Hostel</h2>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading dormitories…</p>}

      {dorms.map((dorm) => {
        const vacant     = dorm.beds.filter((b) => b.status === 'VACANT').length;
        const occupied   = dorm.beds.filter((b) => b.status === 'OCCUPIED').length;
        const maintenance = dorm.beds.filter((b) => b.status === 'MAINTENANCE').length;
        const pct        = dorm.beds.length ? Math.round((occupied / dorm.beds.length) * 100) : 0;

        return (
          <div key={dorm.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-800">{dorm.name}</h3>
                <p className="text-xs text-slate-500">{dorm.gender} · capacity {dorm.capacity}</p>
              </div>
              <div className="flex gap-4 text-center text-xs">
                <Chip label="Vacant"      count={vacant}      color="green" />
                <Chip label="Occupied"    count={occupied}    color="blue" />
                <Chip label="Maintenance" count={maintenance} color="amber" />
              </div>
            </div>

            {/* Occupancy bar */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="tabular-nums">{pct}% full</span>
              </div>
            </div>

            {/* Beds grid */}
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {dorm.beds.map((bed) => (
                <div
                  key={bed.id}
                  title={`Room ${bed.roomNumber} · Bed ${bed.bedNumber} · ${bed.status}`}
                  className={[
                    'flex h-9 w-14 flex-col items-center justify-center rounded-md border text-[10px] font-medium transition-colors',
                    bed.status === 'VACANT'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : bed.status === 'OCCUPIED'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
                  ].join(' ')}
                >
                  <span>{bed.roomNumber}</span>
                  <span className="opacity-60">B{bed.bedNumber}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!isLoading && dorms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          No dormitories configured yet.
        </div>
      )}
    </div>
  );
}

function Chip({ label, count, color }: { label: string; count: number; color: 'green' | 'blue' | 'amber' }) {
  const colors = {
    green: 'text-green-700',
    blue:  'text-blue-700',
    amber: 'text-amber-700',
  };
  return (
    <div>
      <p className={`text-sm font-bold ${colors[color]}`}>{count}</p>
      <p className="text-slate-400">{label}</p>
    </div>
  );
}
