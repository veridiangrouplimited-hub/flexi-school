import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, Download, Eye } from 'lucide-react';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { api } from '../lib/api';
import { useTenant } from '../context/TenantContext';
import { ReportCardPDF } from '../pdf/ReportCardPDF';

interface ReportCard {
  student: { name: string; admissionNo: string; class: string | null; session: string | null; term: string };
  results: Array<{ subjectName: string; subjectCode: string | null; components: Record<string, number>; total: number; grade: string; remark: string; gradePoints: number; position: number | null; classSize: number }>;
  summary: { totalScore: number; average: number; gpa: number; subjectCount: number; overallPosition: number | null; classSize: number };
}

interface Session { id: string; name: string; isCurrent: boolean; }
interface Class   { id: string; name: string; }
interface Student { id: string; admissionNo: string; name: string; }

export function AcademicsPage() {
  const { name: schoolName, branding } = useTenant();
  const motto = (branding as Record<string, unknown>)?.schoolMotto as string | undefined;

  const [sessionId, setSessionId] = useState('');
  const [classId,   setClassId]   = useState('');
  const [studentId, setStudentId] = useState('');
  const [term,      setTerm]      = useState<'FIRST' | 'SECOND' | 'THIRD'>('FIRST');
  const [submitted, setSubmitted] = useState(false);

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

  const studentName = students.find(s => s.id === studentId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-slate-500" />
        <h2 className="text-xl font-semibold text-slate-900">Academics</h2>
      </div>

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
