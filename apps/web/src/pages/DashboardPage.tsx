import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, BookOpen, Banknote, ClipboardList,
  Bell, CheckCircle, AlertCircle, TrendingUp, Building2, Pin,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentNotice { id: string; title: string; category: string; isPinned: boolean; publishedAt: string; }
interface AdminStats {
  role: string; studentCount: number; attendancePct: number | null;
  attendanceMarked: boolean; outstandingFees: number; noticeCount: number;
  recentNotices: RecentNotice[];
}
interface TeacherStats {
  role: string; sessionName: string; sessionId: string;
  classes: { id: string; name: string; studentCount: number; markedToday: boolean }[];
  recentNotices: RecentNotice[];
}
interface StudentStats {
  role: string; sessionName: string;
  attendancePct: number | null; attendanceDays: number;
  outstandingFees: number;
  recentScores: { subject: string; code: string | null; total: number; term: string }[];
  recentNotices: RecentNotice[];
}
type DashStats = AdminStats | TeacherStats | StudentStats;

const CAT_COLORS: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-600', ACADEMIC: 'bg-blue-100 text-blue-700',
  FINANCE: 'bg-green-100 text-green-700',  HOSTEL: 'bg-amber-100 text-amber-700',
  SPORTS:  'bg-purple-100 text-purple-700', EMERGENCY: 'bg-red-100 text-red-700',
};

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const role    = useAuthStore(s => s.role);
  const { name, subTier, flags } = useTenant();

  const { data: stats, isLoading } = useQuery<DashStats>({
    queryKey: ['dashboard-stats'],
    queryFn:  () => api.get('/api/dashboard/stats'),
  });

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading dashboard…</div>;
  }

  if (role === 'SCHOOL_ADMIN' || role === 'PRINCIPAL') {
    return <AdminDashboard stats={stats as AdminStats} schoolName={name} tier={subTier} flags={flags} />;
  }
  if (role === 'TEACHER') {
    return <TeacherDashboard stats={stats as TeacherStats} schoolName={name} />;
  }
  if (role === 'STUDENT') {
    return <StudentDashboard stats={stats as StudentStats} schoolName={name} />;
  }

  // Parent / fallback
  return <ParentDashboard stats={stats} schoolName={name} />;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ stats, schoolName, tier, flags }: {
  stats:      AdminStats | undefined;
  schoolName: string;
  tier:       string | undefined;
  flags:      Record<string, boolean>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{schoolName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">School Admin Dashboard · {(tier ?? '').replace(/_/g, ' ')} Plan</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users}         label="Total Students"    value={stats?.studentCount?.toString() ?? '—'} />
        <StatCard
          icon={ClipboardList}
          label="Attendance Today"
          value={stats?.attendancePct != null ? `${stats.attendancePct}%` : stats?.attendanceMarked ? '0%' : 'Not marked'}
          sub={stats?.attendancePct != null ? (stats.attendancePct >= 80 ? 'On track' : 'Low') : undefined}
          highlight={stats?.attendancePct != null && stats.attendancePct < 80}
        />
        <StatCard
          icon={Banknote}
          label="Outstanding Fees"
          value={stats?.outstandingFees != null ? `$${Number(stats.outstandingFees).toLocaleString()}` : '—'}
          highlight={(stats?.outstandingFees ?? 0) > 0}
        />
        <StatCard icon={Bell} label="Notices" value={stats?.noticeCount?.toString() ?? '—'} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ActionCard to="/attendance" icon={ClipboardList} label="Mark Attendance" color="blue" />
        <ActionCard to="/academics"  icon={BookOpen}      label="Report Cards"    color="indigo" />
        {flags.finance && <ActionCard to="/finance"    icon={Banknote}      label="Manage Fees"     color="green" />}
        {flags.hostel  && <ActionCard to="/hostel"     icon={Building2}     label="Hostel"          color="amber" />}
        <ActionCard to="/notices"    icon={Bell}          label="Post Notice"     color="slate" />
        <ActionCard to="/settings"   icon={TrendingUp}    label="Settings"        color="slate" />
      </div>

      {/* Recent notices */}
      {(stats?.recentNotices?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Notices</h3>
            <Link to="/notices" className="text-xs text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {stats?.recentNotices?.map(n => <NoticeRow key={n.id} notice={n} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────

function TeacherDashboard({ stats, schoolName }: { stats: TeacherStats | undefined; schoolName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{schoolName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Teacher Dashboard {stats?.sessionName ? `· ${stats.sessionName}` : ''}
        </p>
      </div>

      {/* My classes */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">My Classes — Today's Attendance</h3>
        {!stats?.classes?.length && (
          <p className="text-sm text-slate-400">No classes found for this session.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats?.classes?.map(cls => (
            <Link
              key={cls.id}
              to={`/attendance?classId=${cls.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-semibold text-slate-800">{cls.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cls.studentCount} students</p>
              </div>
              {cls.markedToday
                ? <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700"><CheckCircle className="h-3 w-3" /> Marked</span>
                : <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><AlertCircle className="h-3 w-3" /> Pending</span>
              }
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionCard to="/attendance"  icon={ClipboardList} label="Attendance"   color="blue" />
        <ActionCard to="/academics"   icon={BookOpen}      label="Report Cards" color="indigo" />
        <ActionCard to="/notices"     icon={Bell}          label="Notices"      color="slate" />
        <ActionCard to="/settings"    icon={TrendingUp}    label="Settings"     color="slate" />
      </div>

      {/* Recent notices */}
      {(stats?.recentNotices?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Latest Notices</h3>
            <Link to="/notices" className="text-xs text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {stats?.recentNotices?.map(n => <NoticeRow key={n.id} notice={n} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard({ stats, schoolName }: { stats: StudentStats | undefined; schoolName: string }) {
  const fmtAmount = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{schoolName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Student Dashboard {stats?.sessionName ? `· ${stats.sessionName}` : ''}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Attendance This Term"
          value={stats?.attendancePct != null ? `${stats.attendancePct}%` : 'No records'}
          sub={stats?.attendanceDays ? `${stats.attendanceDays} days recorded` : undefined}
          highlight={stats?.attendancePct != null && stats.attendancePct < 75}
        />
        <StatCard
          icon={Banknote}
          label="Outstanding Fees"
          value={stats?.outstandingFees != null ? fmtAmount(stats.outstandingFees) : '—'}
          highlight={(stats?.outstandingFees ?? 0) > 0}
        />
      </div>

      {/* Recent scores */}
      {(stats?.recentScores?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Scores</h3>
            <Link to="/academics" className="text-xs text-brand-700 hover:underline">Full report card</Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Term</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.recentScores?.map((s, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 font-medium text-slate-700">{s.subject}</td>
                    <td className="px-5 py-3 text-slate-500">{s.term}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{s.total}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreGradeStyle(s.total)}`}>
                        {scoreGrade(s.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionCard to="/academics" icon={BookOpen}      label="My Grades"    color="indigo" />
        <ActionCard to="/finance"   icon={Banknote}      label="My Fees"      color="green" />
        <ActionCard to="/notices"   icon={Bell}          label="Notices"      color="slate" />
        <ActionCard to="/hostel"    icon={Building2}     label="Hostel"       color="amber" />
      </div>

      {/* Recent notices */}
      {(stats?.recentNotices?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Latest Notices</h3>
            <Link to="/notices" className="text-xs text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {stats?.recentNotices?.map(n => <NoticeRow key={n.id} notice={n} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parent Dashboard ──────────────────────────────────────────────────────────

function ParentDashboard({ stats, schoolName }: { stats: DashStats | undefined; schoolName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{schoolName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">Parent Portal</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ActionCard to="/academics" icon={BookOpen}  label="Grades"   color="indigo" />
        <ActionCard to="/finance"   icon={Banknote}  label="Fees"     color="green" />
        <ActionCard to="/notices"   icon={Bell}      label="Notices"  color="slate" />
      </div>
      {((stats as { recentNotices?: RecentNotice[] })?.recentNotices?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Latest Notices</h3>
          <div className="space-y-2">
            {(stats as { recentNotices?: RecentNotice[] })?.recentNotices?.map(n => <NoticeRow key={n.id} notice={n} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, highlight = false }: {
  icon: React.ElementType; label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${highlight ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-100',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:border-green-300 hover:bg-green-100',
  amber:  'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-100',
  slate:  'bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50',
};

function ActionCard({ to, icon: Icon, label, color }: { to: string; icon: React.ElementType; label: string; color: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all shadow-sm ${COLOR_MAP[color] ?? COLOR_MAP.slate}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

function NoticeRow({ notice: n }: { notice: RecentNotice }) {
  return (
    <Link
      to="/notices"
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-brand-200 transition-colors"
    >
      {n.isPinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />}
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CAT_COLORS[n.category] ?? 'bg-slate-100 text-slate-600'}`}>
        {n.category}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{n.title}</span>
      <span className="flex-shrink-0 text-xs text-slate-400">
        {new Date(n.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </span>
    </Link>
  );
}

function scoreGrade(total: number): string {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

function scoreGradeStyle(total: number): string {
  if (total >= 70) return 'bg-green-100 text-green-800';
  if (total >= 60) return 'bg-blue-100 text-blue-800';
  if (total >= 50) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}
