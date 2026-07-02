import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, Download, Eye, Layers, PenLine, Save } from 'lucide-react';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../stores/authStore';
import { ReportCardPDF, ClassReportCardsPDF } from '../pdf/ReportCardPDF';

interface ReportCard {
  student: { name: string; admissionNo: string; class: string | null; session: string | null; term: string };
  results: Array<{ subjectName: string; subjectCode: string | null; components: Record<string, number>; total: number; grade: string; remark: string; gradePoints: number; position: number | null; classSize: number }>;
  summary: { totalScore: number; average: number; gpa: number; subjectCount: number; overallPosition: number | null; classSize: number };
}

interface Session { id: string; name: string; isCurrent: boolean; }
interface Class   { id: string; name: string; }
interface Student { id: string; admissionNo: string; name: string; }
interface Subject { id: string; name: string; code: string | null; }
interface Score   { id: string; studentId: string; subjectId: string; components: Record<string, number>; total: number; }
interface BatchResult { cards: ReportCard[]; total: number; skipped: number; }

const CA_MAX = 40, EXAM_MAX = 60;

export function AcademicsPage() {
  const { name: schoolName, branding } = useTenant();
  const motto = (branding as Record<string, unknown>)?.schoolMotto as string | undefined;
  const can = useAuthStore(s => s.can);

  const [sessionId, setSessionId] = useState('');
  const [classId,   setClassId]   = useState('');
  const [studentId, setStudentId] = useState('');
  const [term,      setTerm]      = useState<'FIRST' | 'SECOND' | 'THIRD'>('FIRST');
  const [submitted, setSubmitted] = useState(false);

  // Batch mode
  const [batchClassId,   setBatchClassId]   = useState('');   // '' = entire school
  const [batchTerm,      setBatchTerm]      = useState<'FIRST' | 'SECOND' | 'THIRD'>('FIRST');
  const [batchSubmitted, setBatchSubmitted] = useState(false);

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn:  () => api.get('/api/academic/sessions'),
  });

  useEffect(() => {
    if (sessions.length && !sessionId) {
      const cur = sessions.find(s => s.isCurrent);
      if (cur) setSessionId(cur.id);
    }
  }, [sessions, sessionId]);

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ['classes', sessionId],
    queryFn:  () => api.get(`/api/academic/classes?sessionId=${sessionId}`),
    enabled:  !!sessionId,
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students', classId],
    queryFn:  () => api.get(`/api/academic/students?classId=${classId}`),
    enabled:  !!classId,
  });

  const { data: reportCard, isLoading: cardLoading, error: cardError } = useQuery<ReportCard>({
    queryKey: ['report-card', studentId, sessionId, term],
    queryFn:  () => api.get(`/api/academic/report-card?studentId=${studentId}&sessionId=${sessionId}&term=${term}`),
    enabled:  submitted && !!studentId && !!sessionId,
  });

  const { data: batch, isLoading: batchLoading } = useQuery<BatchResult>({
    queryKey: ['report-cards-batch', batchClassId, sessionId, batchTerm],
    queryFn:  () => api.get(
      `/api/academic/report-cards?sessionId=${sessionId}&term=${batchTerm}${batchClassId ? `&classId=${batchClassId}` : ''}`
    ),
    enabled:  batchSubmitted && !!sessionId,
    staleTime: 5 * 60_000,
  });

  const batchLabel = batchClassId
    ? (classes.find(c => c.id === batchClassId)?.name ?? 'Class')
    : 'Entire School';

  const studentName = students.find(s => s.id === studentId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Academics</h2>
      </div>

      {/* Score entry — teachers only */}
      {can('academic:write') && sessionId && (
        <ScoreEntry sessionId={sessionId} classes={classes} />
      )}

      {/* Report card generator */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4" />
          Generate Report Card
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Session</label>
            <select
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setClassId(''); setStudentId(''); setSubmitted(false); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="">Select…</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? ' (current)' : ''}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Class</label>
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setStudentId(''); setSubmitted(false); }}
              disabled={!sessionId}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Student</label>
            <select
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setSubmitted(false); }}
              disabled={!classId}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Term</label>
            <select
              value={term}
              onChange={(e) => { setTerm(e.target.value as typeof term); setSubmitted(false); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="FIRST">First</option>
              <option value="SECOND">Second</option>
              <option value="THIRD">Third</option>
            </select>
          </div>
        </div>

        <button
          disabled={!studentId || !sessionId}
          onClick={() => setSubmitted(true)}
          className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          Generate
        </button>
      </div>

      {/* Batch report cards */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Layers className="h-4 w-4" />
          Batch Report Cards
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Generate one PDF containing report cards for a whole class — or the entire school — in a single click.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Scope</label>
            <select
              value={batchClassId}
              onChange={(e) => { setBatchClassId(e.target.value); setBatchSubmitted(false); }}
              disabled={!sessionId}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Entire school</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} only</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Term</label>
            <select
              value={batchTerm}
              onChange={(e) => { setBatchTerm(e.target.value as typeof batchTerm); setBatchSubmitted(false); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="FIRST">First</option>
              <option value="SECOND">Second</option>
              <option value="THIRD">Third</option>
            </select>
          </div>

          <button
            disabled={!sessionId || batchLoading}
            onClick={() => setBatchSubmitted(true)}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {batchLoading ? 'Generating…' : 'Generate Batch'}
          </button>
        </div>

        {batchSubmitted && batchLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
            Compiling report cards — this may take a moment…
          </div>
        )}

        {batchSubmitted && !batchLoading && batch && (
          batch.cards.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3">
              <p className="text-sm text-brand-900">
                <span className="font-semibold">{batch.cards.length}</span> report card{batch.cards.length !== 1 ? 's' : ''} ready
                {batch.skipped > 0 && <span className="text-brand-700"> · {batch.skipped} student{batch.skipped !== 1 ? 's' : ''} skipped (no scores for this term)</span>}
              </p>
              <div className="flex items-center gap-2">
                <PDFDownloadLink
                  document={<ClassReportCardsPDF cards={batch.cards} schoolName={schoolName} motto={motto} batchLabel={batchLabel} />}
                  fileName={`report-cards-${batchLabel.replace(/\s/g, '-').toLowerCase()}-${batchTerm.toLowerCase()}-term.pdf`}
                >
                  {({ loading }) => (
                    <button className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                      <Download className="h-4 w-4" />
                      {loading ? 'Preparing…' : `Download All (${batch.cards.length})`}
                    </button>
                  )}
                </PDFDownloadLink>
                <BlobProvider document={<ClassReportCardsPDF cards={batch.cards} schoolName={schoolName} motto={motto} batchLabel={batchLabel} />}>
                  {({ url, loading }) => (
                    <a
                      href={url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 ${loading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </a>
                  )}
                </BlobProvider>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No report cards could be generated — no scores found for {batchLabel} in the {batchTerm.toLowerCase()} term.
            </div>
          )
        )}
      </div>

      {/* Report card display */}
      {submitted && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {cardLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="h-32 rounded bg-slate-100" />
            </div>
          )}
          {cardError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              No report card found for this student and term combination.
            </div>
          )}
          {reportCard && (
            <>
              {/* PDF action buttons */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <PDFDownloadLink
                  document={<ReportCardPDF card={reportCard} schoolName={schoolName} motto={motto} />}
                  fileName={`report-card-${reportCard.student.admissionNo}-${term}.pdf`}
                >
                  {({ loading }) => (
                    <button className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                      <Download className="h-4 w-4" />
                      {loading ? 'Preparing PDF…' : 'Download PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
                <BlobProvider document={<ReportCardPDF card={reportCard} schoolName={schoolName} motto={motto} />}>
                  {({ url, loading }) => (
                    <a
                      href={url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${loading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <Eye className="h-4 w-4" />
                      {loading ? 'Preparing…' : 'View PDF'}
                    </a>
                  )}
                </BlobProvider>
                <span className="text-xs text-slate-400">
                  {studentName} · {term} Term
                </span>
              </div>

              <ReportCardView card={reportCard} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score entry (teachers) ────────────────────────────────────────────────────

function ScoreEntry({ sessionId, classes }: { sessionId: string; classes: Class[] }) {
  const qc = useQueryClient();
  const [classId,   setClassId]   = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term,      setTerm]      = useState<'FIRST' | 'SECOND' | 'THIRD'>('FIRST');
  const [rows,      setRows]      = useState<Record<string, { ca: string; exam: string }>>({});

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn:  () => api.get('/api/academic/subjects'),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students', classId],
    queryFn:  () => api.get(`/api/academic/students?classId=${classId}`),
    enabled:  !!classId,
  });

  const ready = !!classId && !!subjectId && !!sessionId;

  const { data: existingScores, isFetching } = useQuery<Score[]>({
    queryKey: ['scores', classId, subjectId, sessionId, term],
    queryFn:  () => api.get(`/api/academic/scores?classId=${classId}&subjectId=${subjectId}&sessionId=${sessionId}&term=${term}`),
    enabled:  ready,
  });

  // Pre-fill the grid from saved scores whenever the selection changes
  useEffect(() => {
    if (!existingScores) { setRows({}); return; }
    const next: Record<string, { ca: string; exam: string }> = {};
    for (const s of existingScores) {
      next[s.studentId] = {
        ca:   s.components.CA   != null ? String(s.components.CA)   : '',
        exam: s.components.Exam != null ? String(s.components.Exam) : '',
      };
    }
    setRows(next);
  }, [existingScores]);

  const savedIds = new Set((existingScores ?? []).map(s => s.studentId));

  function setCell(studentId: string, field: 'ca' | 'exam', value: string) {
    setRows(prev => {
      const current = prev[studentId] ?? { ca: '', exam: '' };
      return { ...prev, [studentId]: { ...current, [field]: value } };
    });
  }

  function rowTotal(studentId: string): number | null {
    const r = rows[studentId];
    if (!r || r.ca === '' || r.exam === '') return null;
    return Number(r.ca) + Number(r.exam);
  }

  function rowInvalid(studentId: string): boolean {
    const r = rows[studentId];
    if (!r) return false;
    const ca = r.ca === '' ? null : Number(r.ca);
    const ex = r.exam === '' ? null : Number(r.exam);
    return (ca != null && (isNaN(ca) || ca < 0 || ca > CA_MAX))
        || (ex != null && (isNaN(ex) || ex < 0 || ex > EXAM_MAX));
  }

  const completeRows = students.filter(st => {
    const r = rows[st.id];
    return r && r.ca !== '' && r.exam !== '' && !rowInvalid(st.id);
  });
  const anyInvalid = students.some(st => rowInvalid(st.id));

  const save = useMutation({
    mutationFn: async () => {
      for (const st of completeRows) {
        const r  = rows[st.id];
        const ca = Number(r.ca), exam = Number(r.exam);
        await api.post('/api/academic/scores', {
          studentId:  st.id,
          subjectId,
          sessionId,
          term,
          components: { CA: ca, Exam: exam },
          total:      ca + exam,
        });
      }
      return completeRows.length;
    },
    onSuccess: (n) => {
      toast.success(`Saved scores for ${n} student${n !== 1 ? 's' : ''}`);
      qc.invalidateQueries({ queryKey: ['scores'] });
      qc.invalidateQueries({ queryKey: ['report-card'] });
      qc.invalidateQueries({ queryKey: ['report-cards-batch'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save scores'),
  });

  const subjectName = subjects.find(s => s.id === subjectId)?.name ?? '';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <PenLine className="h-4 w-4" />
        Score Entry
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Enter CA (max {CA_MAX}) and Exam (max {EXAM_MAX}) scores for a class and subject. Saved scores feed straight into report cards.
      </p>

      <div className="flex flex-wrap gap-3">
        <select
          value={classId}
          onChange={e => setClassId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">Select class…</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">Select subject…</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={term}
          onChange={e => setTerm(e.target.value as typeof term)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="FIRST">First Term</option>
          <option value="SECOND">Second Term</option>
          <option value="THIRD">Third Term</option>
        </select>
      </div>

      {ready && isFetching && (
        <div className="mt-4 animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}
        </div>
      )}

      {ready && !isFetching && students.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-8 px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="w-28 px-3 py-2.5 text-center">CA <span className="font-normal normal-case text-slate-400">/{CA_MAX}</span></th>
                  <th className="w-28 px-3 py-2.5 text-center">Exam <span className="font-normal normal-case text-slate-400">/{EXAM_MAX}</span></th>
                  <th className="w-20 px-3 py-2.5 text-center">Total</th>
                  <th className="w-24 px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st, i) => {
                  const total   = rowTotal(st.id);
                  const invalid = rowInvalid(st.id);
                  return (
                    <tr key={st.id} className={invalid ? 'bg-red-50/60' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 text-xs tabular-nums text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-400">{st.admissionNo}</p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number" min={0} max={CA_MAX}
                          value={rows[st.id]?.ca ?? ''}
                          onChange={e => setCell(st.id, 'ca', e.target.value)}
                          aria-label={`CA score for ${st.name}`}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none ${
                            invalid ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-brand-700'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number" min={0} max={EXAM_MAX}
                          value={rows[st.id]?.exam ?? ''}
                          onChange={e => setCell(st.id, 'exam', e.target.value)}
                          aria-label={`Exam score for ${st.name}`}
                          className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none ${
                            invalid ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-brand-700'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-bold tabular-nums text-slate-800">
                        {total ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {invalid ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Invalid</span>
                        ) : savedIds.has(st.id) ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Saved</span>
                        ) : rows[st.id]?.ca || rows[st.id]?.exam ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Unsaved</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Empty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {completeRows.length} of {students.length} rows ready to save
              {subjectName ? ` · ${subjectName} · ${term.charAt(0) + term.slice(1).toLowerCase()} Term` : ''}
            </p>
            <button
              onClick={() => save.mutate()}
              disabled={completeRows.length === 0 || anyInvalid || save.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Saving…' : `Save Scores (${completeRows.length})`}
            </button>
          </div>
        </>
      )}

      {ready && !isFetching && students.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">No students found in this class.</p>
      )}
    </div>
  );
}

function ReportCardView({ card }: { card: ReportCard }) {
  return (
    <div className="space-y-5">
      {/* Student info */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
        <Info label="Name"         value={card.student.name} />
        <Info label="Admission No" value={card.student.admissionNo} />
        <Info label="Class"        value={card.student.class ?? '—'} />
        <Info label="Term"         value={`${card.student.term} TERM`} />
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Subject</th>
              {Object.keys(card.results[0]?.components ?? {}).map(k => (
                <th key={k} className="px-4 py-3 text-right">{k}</th>
              ))}
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Remark</th>
              <th className="px-4 py-3 text-right">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {card.results.map((r) => (
              <tr key={r.subjectName} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{r.subjectName}</td>
                {Object.values(r.components).map((v, i) => (
                  <td key={i} className="px-4 py-2.5 text-right tabular-nums text-slate-600">{v}</td>
                ))}
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{r.total}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${gradeColor(r.grade)}`}>
                    {r.grade}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{r.remark}</td>
                <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">
                  {r.position ? `${r.position}/${r.classSize}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Total Score"      value={String(card.summary.totalScore)} />
        <Summary label="Average"          value={`${card.summary.average}%`} />
        <Summary label="GPA"              value={String(card.summary.gpa)} />
        <Summary label="Overall Position" value={card.summary.overallPosition ? `${card.summary.overallPosition}/${card.summary.classSize}` : '—'} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800';
  if (grade.startsWith('D') || grade.startsWith('E')) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}
