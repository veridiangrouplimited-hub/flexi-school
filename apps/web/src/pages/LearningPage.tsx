import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  NotebookPen, BookOpen, ClipboardCheck, Plus, X, Trash2, Send,
  Clock, CheckCircle2, GraduationCap, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

// ── Types ────────────────────────────────────────────────────────────────────

interface Session   { id: string; name: string; isCurrent: boolean; }
interface ClassItem { id: string; name: string; _count: { students: number }; }
interface Subject   { id: string; name: string; }

interface Note {
  id: string; title: string; body: string;
  subject: string | null; className: string; term: string; createdAt: string;
}

interface MySubmission {
  id: string; content: string; submittedAt: string;
  score: number | null; feedback: string | null; gradedAt: string | null;
}

interface Assignment {
  id: string; title: string; instructions: string; type: string;
  dueDate: string | null; maxScore: number;
  subject: string | null; className: string; term: string; createdAt: string;
  submissionCount: number;
  mySubmission?: MySubmission | null;
}

interface RollEntry {
  studentId: string; admissionNo: string; name: string;
  submission: MySubmission | null;
}

interface SubmissionsView {
  assignment: { id: string; title: string; type: string; maxScore: number; dueDate: string | null; className: string };
  roll: RollEntry[];
}

const TYPE_STYLES: Record<string, string> = {
  HOMEWORK:   'bg-blue-100 text-blue-700',
  CLASSWORK:  'bg-slate-100 text-slate-700',
  ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
  PROJECT:    'bg-purple-100 text-purple-700',
  TEST:       'bg-red-100 text-red-700',
};

const ASSIGNMENT_TYPES = ['HOMEWORK', 'CLASSWORK', 'ASSIGNMENT', 'PROJECT', 'TEST'];

// ── Page ─────────────────────────────────────────────────────────────────────

export function LearningPage() {
  const can       = useAuthStore(s => s.can);
  const isTeacher = can('academic:write');
  const qc        = useQueryClient();

  const [tab, setTab]         = useState<'notes' | 'assignments'>('notes');
  const [classId, setClassId] = useState('');

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn:  () => api.get('/api/academic/sessions'),
    enabled:  isTeacher,
  });
  const currentSession = sessions.find(s => s.isCurrent) ?? sessions[0];

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes', currentSession?.id],
    queryFn:  () => api.get(`/api/academic/classes?sessionId=${currentSession?.id}`),
    enabled:  isTeacher && !!currentSession,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn:  () => api.get('/api/academic/subjects'),
    enabled:  isTeacher,
  });

  const notesQueryKey = ['lms-notes', isTeacher ? classId : 'mine'];
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: notesQueryKey,
    queryFn:  () => api.get(`/api/lms/notes${isTeacher && classId ? `?classId=${classId}` : ''}`),
    enabled:  !isTeacher || !!classId || true,
  });

  const asgQueryKey = ['lms-assignments', isTeacher ? classId : 'mine'];
  const { data: assignments = [], isLoading: asgLoading } = useQuery<Assignment[]>({
    queryKey: asgQueryKey,
    queryFn:  () => api.get(`/api/lms/assignments${isTeacher && classId ? `?classId=${classId}` : ''}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NotebookPen className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-900">Learning</h2>
        </div>
        {isTeacher && (
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          >
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c._count.students} students)</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card w-fit">
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon={BookOpen} label="Class Notes" />
        <TabButton active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardCheck} label="Assignments" />
      </div>

      {tab === 'notes' && (
        <NotesTab
          notes={notes} isLoading={notesLoading} isTeacher={isTeacher}
          classes={classes} subjects={subjects} sessionId={currentSession?.id}
          onChanged={() => qc.invalidateQueries({ queryKey: ['lms-notes'] })}
        />
      )}

      {tab === 'assignments' && (
        <AssignmentsTab
          assignments={assignments} isLoading={asgLoading} isTeacher={isTeacher}
          classes={classes} subjects={subjects} sessionId={currentSession?.id}
          onChanged={() => qc.invalidateQueries({ queryKey: ['lms-assignments'] })}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab({ notes, isLoading, isTeacher, classes, subjects, sessionId, onChanged }: {
  notes: Note[]; isLoading: boolean; isTeacher: boolean;
  classes: ClassItem[]; subjects: Subject[]; sessionId?: string;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', body: '' });

  const create = useMutation({
    mutationFn: () => api.post('/api/lms/notes', {
      classId:   form.classId,
      subjectId: form.subjectId || undefined,
      sessionId,
      term:      'FIRST',
      title:     form.title,
      body:      form.body,
    }),
    onSuccess: () => {
      toast.success('Class note published');
      setShowForm(false);
      setForm({ classId: '', subjectId: '', title: '', body: '' });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to publish note'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/lms/notes/${id}`),
    onSuccess:  () => { toast.success('Note deleted'); onChanged(); },
    onError:    () => toast.error('Failed to delete note'),
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Note'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-slate-800">Publish Class Note</h3>
          <div className="flex flex-wrap gap-3">
            <select
              value={form.classId}
              onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="">Select class *</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="">Subject (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <input
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <textarea
            placeholder="Note content * — lesson summary, key points, reading list…"
            rows={6}
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <button
            onClick={() => create.mutate()}
            disabled={!form.classId || !form.title || !form.body || create.isPending}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {create.isPending ? 'Publishing…' : 'Publish Note'}
          </button>
        </div>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && notes.length === 0 && (
        <EmptyState icon={BookOpen} message="No class notes yet." />
      )}

      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="rounded-xl border border-slate-200 bg-white shadow-card">
            <button
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {n.subject && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{n.subject}</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{n.className}</span>
                  <span className="text-xs text-slate-400">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="font-medium text-slate-800">{n.title}</p>
              </div>
              {expanded === n.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {expanded === n.id && (
              <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{n.body}</p>
                {isTeacher && (
                  <button
                    onClick={() => { if (confirm('Delete this note?')) remove.mutate(n.id); }}
                    aria-label={`Delete note: ${n.title}`}
                    className="mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete note
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ assignments, isLoading, isTeacher, classes, subjects, sessionId, onChanged }: {
  assignments: Assignment[]; isLoading: boolean; isTeacher: boolean;
  classes: ClassItem[]; subjects: Subject[]; sessionId?: string;
  onChanged: () => void;
}) {
  const [showForm, setShowForm]   = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [grading, setGrading]     = useState<string | null>(null); // assignmentId being graded (teacher)
  const [form, setForm] = useState({
    classId: '', subjectId: '', type: 'HOMEWORK', title: '', instructions: '', dueDate: '', maxScore: '100',
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/lms/assignments', {
      classId:      form.classId,
      subjectId:    form.subjectId || undefined,
      sessionId,
      term:         'FIRST',
      type:         form.type,
      title:        form.title,
      instructions: form.instructions,
      dueDate:      form.dueDate ? new Date(form.dueDate + 'T23:59:00').toISOString() : undefined,
      maxScore:     Number(form.maxScore) || 100,
    }),
    onSuccess: () => {
      toast.success('Assignment posted');
      setShowForm(false);
      setForm({ classId: '', subjectId: '', type: 'HOMEWORK', title: '', instructions: '', dueDate: '', maxScore: '100' });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to post assignment'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/lms/assignments/${id}`),
    onSuccess:  () => { toast.success('Assignment deleted'); setGrading(null); onChanged(); },
    onError:    () => toast.error('Failed to delete assignment'),
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Assignment'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-slate-800">Post Assignment</h3>
          <div className="flex flex-wrap gap-3">
            <select
              value={form.classId}
              onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="">Select class *</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              <option value="">Subject (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Due</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Max score</label>
              <input
                type="number" min={1} max={1000}
                value={form.maxScore}
                onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
              />
            </div>
          </div>
          <input
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <textarea
            placeholder="Instructions * — what should students do, and how will it be marked?"
            rows={4}
            value={form.instructions}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <button
            onClick={() => create.mutate()}
            disabled={!form.classId || !form.title || !form.instructions || create.isPending}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {create.isPending ? 'Posting…' : 'Post Assignment'}
          </button>
        </div>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && assignments.length === 0 && (
        <EmptyState icon={ClipboardCheck} message="No assignments posted yet." />
      )}

      <div className="space-y-3">
        {assignments.map(a => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white shadow-card">
            <button
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLES[a.type] ?? TYPE_STYLES.CLASSWORK}`}>
                    {a.type}
                  </span>
                  {a.subject && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{a.subject}</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{a.className}</span>
                  {a.dueDate && <DueChip dueDate={a.dueDate} submission={a.mySubmission} />}
                </div>
                <p className="font-medium text-slate-800">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Max score: {a.maxScore}
                  {isTeacher && ` · ${a.submissionCount} submission${a.submissionCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              <StatusBadge assignment={a} isTeacher={isTeacher} />
              {expanded === a.id ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />}
            </button>

            {expanded === a.id && (
              <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.instructions}</p>

                {!isTeacher && <StudentSubmitPanel assignment={a} onChanged={onChanged} />}

                {isTeacher && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setGrading(grading === a.id ? null : a.id)}
                      className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      <GraduationCap className="h-4 w-4" />
                      {grading === a.id ? 'Hide Submissions' : `Mark Submissions (${a.submissionCount})`}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this assignment and all submissions?')) remove.mutate(a.id); }}
                      aria-label={`Delete assignment: ${a.title}`}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}

                {isTeacher && grading === a.id && <GradingPanel assignmentId={a.id} onChanged={onChanged} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Student submit panel ──────────────────────────────────────────────────────

function StudentSubmitPanel({ assignment: a, onChanged }: { assignment: Assignment; onChanged: () => void }) {
  const [text, setText] = useState(a.mySubmission?.content ?? '');
  const sub = a.mySubmission;

  const submit = useMutation({
    mutationFn: () => api.post(`/api/lms/assignments/${a.id}/submit`, { content: text }),
    onSuccess:  () => { toast.success('Submitted — good work!'); onChanged(); },
    onError:    (e: Error) => toast.error(e.message || 'Failed to submit'),
  });

  if (sub?.gradedAt) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
            <CheckCircle2 className="h-4 w-4" /> Graded
          </p>
          <p className="text-lg font-bold text-brand-800">{sub.score}/{a.maxScore}</p>
        </div>
        {sub.feedback && (
          <p className="mb-3 rounded-lg bg-white px-3 py-2 text-sm italic text-slate-700">“{sub.feedback}”</p>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Your submission</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{sub.content}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {sub ? 'Your submission (you can update it until it is graded)' : 'Submit your work'}
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type your answer, essay, or a description of your work here…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        {sub
          ? <p className="text-xs text-slate-500">Last submitted {fmtDateTime(sub.submittedAt)}</p>
          : <span />}
        <button
          onClick={() => submit.mutate()}
          disabled={!text.trim() || submit.isPending}
          className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {submit.isPending ? 'Submitting…' : sub ? 'Update Submission' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

// ── Teacher grading panel ─────────────────────────────────────────────────────

function GradingPanel({ assignmentId, onChanged }: { assignmentId: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});

  const { data, isLoading } = useQuery<SubmissionsView>({
    queryKey: ['lms-submissions', assignmentId],
    queryFn:  () => api.get(`/api/lms/assignments/${assignmentId}/submissions`),
  });

  const grade = useMutation({
    mutationFn: ({ submissionId, score, feedback }: { submissionId: string; score: number; feedback: string }) =>
      api.patch(`/api/lms/submissions/${submissionId}/grade`, { score, feedback: feedback || undefined }),
    onSuccess: () => {
      toast.success('Grade saved');
      qc.invalidateQueries({ queryKey: ['lms-submissions', assignmentId] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save grade'),
  });

  if (isLoading) return <Skeleton rows={3} />;
  if (!data) return null;

  const submittedCount = data.roll.filter(r => r.submission).length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <p className="text-sm font-semibold text-slate-700">{data.assignment.className} — Submissions</p>
        <p className="text-xs text-slate-500">{submittedCount}/{data.roll.length} submitted</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {data.roll.map(r => {
          const d = drafts[r.studentId] ?? {
            score:    r.submission?.score != null ? String(r.submission.score) : '',
            feedback: r.submission?.feedback ?? '',
          };
          const setDraft = (patch: Partial<{ score: string; feedback: string }>) =>
            setDrafts(prev => ({ ...prev, [r.studentId]: { ...d, ...patch } }));

          return (
            <li key={r.studentId} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.admissionNo}</p>
                </div>
                {r.submission ? (
                  r.submission.gradedAt ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Graded · {r.submission.score}/{data.assignment.maxScore}
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      Submitted {fmtDate(r.submission.submittedAt)}
                    </span>
                  )
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Not submitted
                  </span>
                )}
              </div>

              {r.submission && (
                <div className="mt-2 space-y-2">
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {r.submission.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number" min={0} max={data.assignment.maxScore}
                      placeholder="Score"
                      value={d.score}
                      onChange={e => setDraft({ score: e.target.value })}
                      className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                      aria-label={`Score for ${r.name}`}
                    />
                    <span className="text-xs text-slate-400">/ {data.assignment.maxScore}</span>
                    <input
                      placeholder="Feedback (optional)"
                      value={d.feedback}
                      onChange={e => setDraft({ feedback: e.target.value })}
                      className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                      aria-label={`Feedback for ${r.name}`}
                    />
                    <button
                      onClick={() => grade.mutate({
                        submissionId: r.submission!.id,
                        score:        Number(d.score),
                        feedback:     d.feedback,
                      })}
                      disabled={d.score === '' || grade.isPending}
                      className="rounded-lg bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                    >
                      {r.submission.gradedAt ? 'Update' : 'Save Grade'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function DueChip({ dueDate, submission }: { dueDate: string; submission?: MySubmission | null }) {
  const due = new Date(dueDate);
  const overdue = due.getTime() < Date.now() && !submission;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      overdue ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'
    }`}>
      <Clock className="h-3 w-3" />
      {overdue ? 'Overdue — ' : 'Due '}
      {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
    </span>
  );
}

function StatusBadge({ assignment: a, isTeacher }: { assignment: Assignment; isTeacher: boolean }) {
  if (isTeacher) return null;
  const sub = a.mySubmission;
  if (!sub) return null;
  return sub.gradedAt
    ? <span className="flex-shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">{sub.score}/{a.maxScore}</span>
    : <span className="flex-shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">Submitted</span>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {[...Array(rows)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100" />)}
    </div>
  );
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
