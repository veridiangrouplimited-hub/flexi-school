import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, Banknote, ClipboardList,
  Bell, CheckCircle, AlertCircle, TrendingUp, Building2, Pin,
  ArrowUpRight, Wallet, CreditCard,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentNotice { id: string; title: string; category: string; isPinned: boolean; publishedAt: string; }
interface TrendPoint   { date: string; pct: number; present: number; total: number; }
interface ClassDist    { name: string; count: number; }
interface RecentPayment { student: string; amount: number; currency: string; gateway: string; term: string; paidAt: string; }

interface AdminStats {
  role: string; studentCount: number; attendancePct: number | null;
  attendanceMarked: boolean; outstandingFees: number; collectedFees: number;
  invoicedFees: number; noticeCount: number;
  recentNotices: RecentNotice[];
  attendanceTrend: TrendPoint[];
  classDistribution: ClassDist[];
  recentPayments: RecentPayment[];
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

const GATEWAY_LABELS: Record<string, string> = {
  PAYPAL: 'PayPal', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer',
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
    return (
      <div className="animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-lg bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 rounded-2xl bg-slate-100 lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
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
  const trend         = stats?.attendanceTrend ?? [];
  const lastTrendPct  = trend.length ? trend[trend.length - 1].pct : null;
  const invoiced      = stats?.invoicedFees ?? 0;
  const collected     = stats?.collectedFees ?? 0;
  const collectedPct  = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-700">{greeting()} 👋</p>
          <h2 className="mt-0.5 font-display text-2xl text-slate-900">{schoolName}</h2>
          <p className="mt-0.5 text-sm text-slate-500">School Admin Dashboard · {(tier ?? '').replace(/_/g, ' ')} Plan</p>
        </div>
        <p className="text-sm font-medium text-slate-500">{todayLabel()}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Students"
          value={stats?.studentCount?.toString() ?? '—'}
          sub="Enrolled this session"
        />
        <KpiCard
          icon={ClipboardList}
          label="Attendance Today"
          value={stats?.attendancePct != null ? `${stats.attendancePct}%` : 'Not marked'}
          sub={stats?.attendancePct == null && lastTrendPct != null ? `Last marked day: ${lastTrendPct}%` : stats?.attendancePct != null ? (stats.attendancePct >= 80 ? 'On track' : 'Below target') : undefined}
          tone={stats?.attendancePct != null && stats.attendancePct < 80 ? 'warn' : 'brand'}
        />
        <KpiCard
          icon={Wallet}
          label="Fees Collected"
          value={money(collected)}
          sub={`${collectedPct}% of ${money(invoiced)} invoiced`}
          tone="brand"
        />
        <KpiCard
          icon={Banknote}
          label="Outstanding Fees"
          value={money(stats?.outstandingFees ?? 0)}
          sub={(stats?.outstandingFees ?? 0) > 0 ? 'Awaiting payment' : 'All settled'}
          tone={(stats?.outstandingFees ?? 0) > 0 ? 'warn' : 'brand'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Trend" subtitle="School-wide, last marked days" />
          {trend.length >= 2
            ? <TrendChart data={trend} />
            : <ChartEmpty message="Mark attendance on at least two days to see the trend." />}
        </Card>

        <Card>
          <CardHeader title="Fee Collection" subtitle="Current session" />
          <div className="flex flex-col items-center gap-4 py-2">
            <Donut pct={collectedPct} />
            <div className="w-full space-y-2">
              <LegendRow color="bg-brand-600" label="Collected" value={money(collected)} />
              <LegendRow color="bg-amber-400" label="Outstanding" value={money(stats?.outstandingFees ?? 0)} />
            </div>
          </div>
        </Card>
      </div>

      {/* Detail row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Students by Class" subtitle="Current session" />
          <BarList
            items={(stats?.classDistribution ?? []).map(c => ({ label: c.name, value: c.count }))}
            emptyMessage="No classes in the current session."
          />
        </Card>

        <Card>
          <CardHeader
            title="Recent Payments"
            subtitle="Latest confirmed"
            action={<Link to="/finance" className="flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:underline">View all <ArrowUpRight className="h-3 w-3" /></Link>}
          />
          {(stats?.recentPayments?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-slate-50">
              {stats?.recentPayments?.map((p, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-50">
                    <CreditCard className="h-3.5 w-3.5 text-brand-700" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.student}</p>
                    <p className="text-xs text-slate-500">{GATEWAY_LABELS[p.gateway] ?? p.gateway} · {shortDate(p.paidAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ChartEmpty message="No payments recorded yet." />
          )}
        </Card>

        <Card>
          <CardHeader title="Quick Actions" subtitle="Jump straight in" />
          <div className="space-y-2">
            <QuickAction to="/attendance" icon={ClipboardList} label="Mark Attendance" />
            <QuickAction to="/academics"  icon={BookOpen}      label="Generate Report Cards" />
            {flags.finance && <QuickAction to="/finance" icon={Banknote} label="Create Invoice" />}
            {flags.hostel  && <QuickAction to="/hostel"  icon={Building2} label="Manage Hostel" />}
            <QuickAction to="/notices"  icon={Bell}       label="Post a Notice" />
            <QuickAction to="/settings" icon={TrendingUp} label="School Settings" />
          </div>
        </Card>
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-700">{greeting()} 👋</p>
          <h2 className="mt-0.5 font-display text-2xl text-slate-900">{schoolName}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Teacher Dashboard {stats?.sessionName ? `· ${stats.sessionName}` : ''}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-500">{todayLabel()}</p>
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
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-lg"
            >
              <div>
                <p className="font-semibold text-slate-800">{cls.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{cls.studentCount} students</p>
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
        <QuickAction to="/attendance" icon={ClipboardList} label="Attendance" />
        <QuickAction to="/academics"  icon={BookOpen}      label="Report Cards" />
        <QuickAction to="/notices"    icon={Bell}          label="Notices" />
        <QuickAction to="/settings"   icon={TrendingUp}    label="Settings" />
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-700">{greeting()} 👋</p>
          <h2 className="mt-0.5 font-display text-2xl text-slate-900">{schoolName}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Student Dashboard {stats?.sessionName ? `· ${stats.sessionName}` : ''}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-500">{todayLabel()}</p>
      </div>

      {/* Attendance ring + fees */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Attendance This Term" subtitle={stats?.attendanceDays ? `${stats.attendanceDays} days recorded` : 'No records yet'} />
          <div className="flex items-center justify-center py-2">
            {stats?.attendancePct != null
              ? <ProgressRing pct={stats.attendancePct} />
              : <ChartEmpty message="No attendance recorded this term." />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Outstanding Fees" subtitle="Across all invoices" />
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <p className={`text-3xl font-bold tracking-tight ${(stats?.outstandingFees ?? 0) > 0 ? 'text-amber-600' : 'text-brand-700'}`}>
              {money(stats?.outstandingFees ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              {(stats?.outstandingFees ?? 0) > 0 ? 'Payment due — see the Finance page' : 'You are all paid up 🎉'}
            </p>
            <Link to="/finance" className="mt-1 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-800">
              View My Fees
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent scores */}
      {(stats?.recentScores?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Scores</h3>
            <Link to="/academics" className="text-xs text-brand-700 hover:underline">Full report card</Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
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
        <QuickAction to="/academics" icon={BookOpen}  label="My Grades" />
        <QuickAction to="/finance"   icon={Banknote}  label="My Fees" />
        <QuickAction to="/notices"   icon={Bell}      label="Notices" />
        <QuickAction to="/hostel"    icon={Building2} label="Hostel" />
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
        <p className="text-sm font-medium text-brand-700">{greeting()} 👋</p>
        <h2 className="mt-0.5 font-display text-2xl text-slate-900">{schoolName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">Parent Portal</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickAction to="/academics" icon={BookOpen} label="Grades" />
        <QuickAction to="/finance"   icon={Banknote} label="Fees" />
        <QuickAction to="/notices"   icon={Bell}     label="Notices" />
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

// ── Layout primitives ─────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <p className="max-w-[220px] text-center text-xs text-slate-400">{message}</p>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${color}`} />
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, tone = 'brand' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'brand' | 'warn';
}) {
  const tile = tone === 'warn' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-700';
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-2xl font-bold tracking-tight ${tone === 'warn' ? 'text-amber-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── SVG charts ────────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendPoint[] }) {
  const W = 560, H = 190, PX = 24, PT = 14, PB = 28;
  const n  = data.length;
  const x  = (i: number) => (n === 1 ? W / 2 : PX + (i * (W - 2 * PX)) / (n - 1));
  const y  = (pct: number) => PT + ((100 - pct) * (H - PT - PB)) / 100;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.pct).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z`;

  const dayLabel = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Attendance trend chart">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {[0, 50, 100].map(g => (
        <g key={g}>
          <line x1={PX} y1={y(g)} x2={W - PX} y2={y(g)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={g === 0 ? undefined : '3 4'} />
          <text x={W - PX + 4} y={y(g) + 3} fontSize="9" fill="#94a3b8">{g}%</text>
        </g>
      ))}

      {/* Area + line */}
      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + labels */}
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.pct)} r="4" fill="#ffffff" stroke="#15803d" strokeWidth="2.5" />
          <text x={x(i)} y={y(d.pct) - 9} fontSize="9.5" fontWeight="600" fill="#166534" textAnchor="middle">{d.pct}%</text>
          <text x={x(i)} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">{dayLabel(d.date)}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ pct }: { pct: number }) {
  const R = 52, SW = 14, CX = 70, CY = 70;
  const circ = 2 * Math.PI * R;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${pct}% of fees collected`}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fbbf24" strokeOpacity="0.35" strokeWidth={SW} />
      <circle
        cx={CX} cy={CY} r={R} fill="none"
        stroke="#15803d" strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(-90 ${CX} ${CY})`}
      />
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize="24" fontWeight="700" fill="#0f172a">{pct}%</text>
      <text x={CX} y={CY + 16} textAnchor="middle" fontSize="9" fill="#64748b">collected</text>
    </svg>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const R = 56, SW = 12, CX = 72, CY = 72;
  const circ = 2 * Math.PI * R;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const color = pct >= 75 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626';

  return (
    <svg width="144" height="144" viewBox="0 0 144 144" role="img" aria-label={`${pct}% attendance`}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={SW} />
      <circle
        cx={CX} cy={CY} r={R} fill="none"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(-90 ${CX} ${CY})`}
      />
      <text x={CX} y={CY - 2} textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">{pct}%</text>
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize="9.5" fill="#64748b">present</text>
    </svg>
  );
}

function BarList({ items, emptyMessage }: { items: { label: string; value: number }[]; emptyMessage: string }) {
  if (!items.length) return <ChartEmpty message={emptyMessage} />;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{it.label}</span>
            <span className="text-xs font-semibold text-slate-500">{it.value} students</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Small shared pieces ───────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-card transition-all hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-800"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 transition-colors group-hover:bg-brand-100">
        <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-brand-700" />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </Link>
  );
}

function NoticeRow({ notice: n }: { notice: RecentNotice }) {
  return (
    <Link
      to="/notices"
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-card transition-all hover:border-brand-200 hover:shadow-card-lg"
    >
      {n.isPinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />}
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CAT_COLORS[n.category] ?? 'bg-slate-100 text-slate-600'}`}>
        {n.category}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 transition-colors group-hover:text-brand-800">{n.title}</span>
      <span className="flex-shrink-0 text-xs text-slate-500">
        {new Date(n.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </span>
    </Link>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
