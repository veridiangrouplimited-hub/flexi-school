import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Check, X, Clock, AlertTriangle, Save } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Session   { id: string; name: string; isCurrent: boolean; }
interface ClassItem { id: string; name: string; sessionId: string; _count: { students: number }; }
interface StudentRow {
  studentId:   string;
  admissionNo: string;
  fullName:    string;
  status:      'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;
  notes:       string | null;
  recordId:    string | null;
}

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

const STATUS_CYCLE: Status[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const STATUS_STYLES: Record<Status, string> = {
  PRESENT:  'bg-green-100 text-green-800 border-green-200',
  ABSENT:   'bg-red-100 text-red-800 border-red-200',
  LATE:     'bg-amber-100 text-amber-800 border-amber-200',
  EXCUSED:  'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_ICONS: Record<Status, React.ReactNode> = {
  PRESENT: <Check className="h-3.5 w-3.5" />,
  ABSENT:  <X className="h-3.5 w-3.5" />,
  LATE:    <Clock className="h-3.5 w-3.5" />,
  EXCUSED: <AlertTriangle className="h-3.5 w-3.5" />,
};

export function AttendancePage() {
  const can = useAuthStore(s => s.can);
  const qc  = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]           = useState(today);
  const [classId, setClassId]     = useState('');
  const [sessionId, setSessionId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [saved, setSaved]         = useState(false);

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn:  () => api.get('/api/academic/sessions'),
  });

  const currentSession = sessions.find(s => s.isCurrent) ?? sessions[0];

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes', currentSession?.id],
    queryFn:  () => api.get(`/api/academic/classes?sessionId=${currentSession?.id}`),
    enabled:  !!currentSession,
  });

  const { data: rollData, isLoading } = useQuery<{ students: StudentRow[]; className: string }>({
    queryKey: ['attendance-roll', classId, date],
    queryFn:  () => api.get(`/api/attendance?classId=${classId}&date=${date}`),
    enabled:  !!classId,
  });

  function getStatus(row: StudentRow): Status {
    return overrides[row.studentId] ?? row.status ?? 'PRESENT';
  }

  function cycleStatus(studentId: string, current: Status) {
    const idx  = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    setOverrides(o => ({ ...o, [studentId]: next }));
    setSaved(false);
  }

  function markAll(status: Status) {
    if (!rollData) return;
    const patch: Record<string, Status> = {};
    rollData.students.forEach(s => { patch[s.studentId] = status; });
    setOverrides(patch);
    setSaved(false);
  }

  const submit = useMutation({
    mutationFn: () => {
      if (!rollData || !classId) return Promise.resolve({});
      return api.post('/api/attendance', {
        classId,
        sessionId: sessionId || currentSession?.id,
        date,
        records: rollData.students.map(s => ({
          studentId: s.studentId,
          status:    getStatus(s),
        })),
      });
    },
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['attendance-roll', classId, date] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const counts = rollData
    ? STATUS_CYCLE.map(s => ({ status: s, count: rollData.students.filter(r => getStatus(r) === s).length }))
    : [];

  const canMark = can('academic:write');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Attendance</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select
          value={classId}
          onChange={e => {
            setClassId(e.target.value);
            const cls = classes.find(c => c.id === e.target.value);
            setSessionId(cls?.sessionId ?? '');
            setOverrides({});
            setSaved(false);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">Select class…</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c._count.students})</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={today}
          onChange={e => { setDate(e.target.value); setOverrides({}); setSaved(false); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
      </div>

      {!classId && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          Select a class to view the roll.
        </div>
      )}

      {classId && isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {classId && rollData && (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-3">
            {counts.map(({ status, count }) => (
              <span
                key={status}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
              >
                {STATUS_ICONS[status]} {count} {status.toLowerCase()}
              </span>
            ))}
            {canMark && (
              <div className="ml-auto flex gap-2">
                <button onClick={() => markAll('PRESENT')} className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                  All present
                </button>
                <button onClick={() => markAll('ABSENT')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                  All absent
                </button>
              </div>
            )}
          </div>

          {/* Roll list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {rollData.className} — {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <ul className="divide-y divide-slate-50">
              {rollData.students.map((row, i) => {
                const status = getStatus(row);
                return (
                  <li key={row.studentId} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-7 text-xs text-slate-400 tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{row.fullName}</p>
                      <p className="text-xs text-slate-400">{row.admissionNo}</p>
                    </div>
                    {canMark ? (
                      <button
                        onClick={() => cycleStatus(row.studentId, status)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${STATUS_STYLES[status]}`}
                      >
                        {STATUS_ICONS[status]} {status}
                      </button>
                    ) : row.status ? (
                      <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                        {STATUS_ICONS[row.status]} {row.status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not marked</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {canMark && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submit.isPending ? 'Saving…' : 'Save attendance'}
              </button>
              {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
