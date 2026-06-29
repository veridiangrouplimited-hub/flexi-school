import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Check, X, Clock, AlertTriangle, Save, Download, Eye, Search } from 'lucide-react';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useTenant } from '../context/TenantContext';
import { AttendanceRegisterPDF } from '../pdf/AttendanceRegisterPDF';

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
  const can        = useAuthStore(s => s.can);
  const qc         = useQueryClient();
  const { name: schoolName } = useTenant();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]           = useState(today);
  const [classId, setClassId]     = useState('');
  const [sessionId, setSessionId] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [search, setSearch]       = useState('');
  const [selectAll, setSelectAll] = useState<Status | null>(null);

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

  // Reset overrides/search when the roll changes
  useEffect(() => {
    setOverrides({});
    setSelectAll(null);
    setSearch('');
  }, [classId, date]);

  function getStatus(row: StudentRow): Status {
    return overrides[row.studentId] ?? row.status ?? 'PRESENT';
  }

  function cycleStatus(studentId: string, current: Status) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    setOverrides(o => ({ ...o, [studentId]: next }));
    setSelectAll(null);
  }

  function handleMarkAll(status: Status) {
    if (!rollData) return;
    const patch: Record<string, Status> = {};
    rollData.students.forEach(s => { patch[s.studentId] = status; });
    setOverrides(patch);
    setSelectAll(status);
  }

  const filteredStudents = useMemo(() => {
    if (!rollData) return [];
    const q = search.toLowerCase();
    return q
      ? rollData.students.filter(s => s.fullName.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q))
      : rollData.students;
  }, [rollData, search]);

  const submit = useMutation({
    mutationFn: () => {
      if (!rollData || !classId) return Promise.resolve({});
      return api.post('/api/attendance', {
        classId,
        sessionId: sessionId || currentSession?.id,
        date,
        records: rollData.students.map(s => ({ studentId: s.studentId, status: getStatus(s) })),
      });
    },
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      qc.invalidateQueries({ queryKey: ['attendance-roll', classId, date] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to save attendance'),
  });

  const counts = rollData
    ? STATUS_CYCLE.map(s => ({ status: s, count: rollData.students.filter(r => getStatus(r) === s).length }))
    : [];

  const canMark = can('academic:write');
  const className = rollData?.className ?? classes.find(c => c.id === classId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Attendance</h2>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={classId}
          onChange={e => {
            setClassId(e.target.value);
            const cls = classes.find(c => c.id === e.target.value);
            setSessionId(cls?.sessionId ?? '');
            setOverrides({});
            setSelectAll(null);
            setSearch('');
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">Select class…</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c._count.students} students)</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={today}
          onChange={e => { setDate(e.target.value); setOverrides({}); setSelectAll(null); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        {rollData && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-brand-700 focus:outline-none w-44"
            />
          </div>
        )}
      </div>

      {!classId && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Select a class to view the attendance roll</p>
          <p className="text-xs text-slate-400 mt-1">Choose from {classes.length} class{classes.length !== 1 ? 'es' : ''} available</p>
        </div>
      )}

      {classId && isLoading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-100" />)}
        </div>
      )}

      {classId && rollData && (
        <>
          {/* Status summary + bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Select-all buttons */}
            {canMark && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <span className="px-2 text-xs font-medium text-slate-500">Mark all:</span>
                {STATUS_CYCLE.map(st => (
                  <button
                    key={st}
                    onClick={() => handleMarkAll(st)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      selectAll === st
                        ? STATUS_STYLES[st]
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {STATUS_ICONS[st]} {st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Count chips */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {counts.map(({ status, count }) => (
                <span
                  key={status}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
                >
                  {STATUS_ICONS[status]} {count}
                </span>
              ))}
              <span className="flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {rollData.students.length} total
              </span>
            </div>
          </div>

          {/* Roll list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {rollData.className} — {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {search && (
                <p className="text-xs text-slate-400">{filteredStudents.length} of {rollData.students.length} shown</p>
              )}
            </div>

            {filteredStudents.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No students match "{search}"
              </div>
            )}

            <ul className="divide-y divide-slate-50">
              {filteredStudents.map((row, i) => {
                const status = getStatus(row);
                return (
                  <li key={row.studentId} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className="w-7 flex-shrink-0 text-xs text-slate-400 tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{row.fullName}</p>
                      <p className="text-xs text-slate-400">{row.admissionNo}</p>
                    </div>
                    {canMark ? (
                      <button
                        onClick={() => cycleStatus(row.studentId, status)}
                        title="Click to change status"
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${STATUS_STYLES[status]}`}
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

          {/* Save + Export row */}
          <div className="flex flex-wrap items-center gap-3">
            {canMark && (
              <button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {submit.isPending ? 'Saving…' : 'Save Attendance'}
              </button>
            )}

            {/* PDF export */}
            <PDFDownloadLink
              document={<AttendanceRegisterPDF className={className} date={date} students={rollData.students} schoolName={schoolName} />}
              fileName={`attendance-${className.replace(/\s/g, '-')}-${date}.pdf`}
            >
              {({ loading }) => (
                <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                  <Download className="h-4 w-4" />
                  {loading ? 'Preparing…' : 'Download Register'}
                </button>
              )}
            </PDFDownloadLink>

            <BlobProvider document={<AttendanceRegisterPDF className={className} date={date} students={rollData.students} schoolName={schoolName} />}>
              {({ url, loading }) => (
                <a
                  href={url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${loading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Eye className="h-4 w-4" />
                  View Register
                </a>
              )}
            </BlobProvider>
          </div>
        </>
      )}
    </div>
  );
}
