import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, Banknote, ClipboardList,
  Bell, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Building2, Pin,
  ArrowUpRight, Wallet, CreditCard, LayoutGrid, GraduationCap, Activity,
  ChevronDown, ChevronUp, CalendarDays, Sparkles, NotebookPen,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentNotice { id: string; title: string; body?: string; category: string; isPinned: boolean; publishedAt: string; }
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

const GRADE_BANDS = [
  { grade: 'A1', range: '70–100', remark: 'Excellent', color: '#15803d' },
  { grade: 'B2', range: '65–69',  remark: 'Very Good', color: '#16a34a' },
  { grade: 'B3', range: '60–64',  remark: 'Good',      color: '#65a30d' },
  { grade: 'C4', range: '55–59',  remark: 'Credit',    color: '#ca8a04' },
  { grade: 'C5', range: '50–54',  remark: 'Credit',    color: '#d97706' },
  { grade: 'C6', range: '45–49',  remark: 'Credit',    color: '#ea580c' },
  { grade: 'D7', range: '40–44',  remark: 'Pass',      color: '#dc2626' },
  { grade: 'E8', range: '35–39',  remark: 'Pass',      color: '#b91c1c' },
  { grade: 'F9', range: '0–34',   remark: 'Fail',      color: '#991b1b' },
];

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
        <div className="h-40 rounded-3xl bg-slate-200" />
        <div className="h-10 w-96 rounded-xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-slate-100" />)}
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

  return <ParentDashboard stats={stats} schoolName={name} />;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'academics' | 'finance' | 'activity';

function AdminDashboard({ stats, schoolName, tier, flags }: {
  stats:      AdminStats | undefined;
  schoolName: string;
  tier:       string | undefined;
  flags:      Record<string, boolean>;
}) {
  const [tab, setTab] = useState<AdminTab>('overview');

  const trend        = stats?.attendanceTrend ?? [];
  const lastTrendPct = trend.length ? trend[trend.length - 1].pct : null;
  const trendDelta   = trend.length >= 2 ? trend[trend.length - 1].pct - trend[trend.length - 2].pct : null;
  const invoiced     = stats?.invoicedFees ?? 0;
  const collected    = stats?.collectedFees ?? 0;
  const outstanding  = stats?.outstandingFees ?? 0;
  const collectedPct = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
  const gaugePct     = stats?.attendancePct ?? lastTrendPct;

  const tabs: { id: AdminTab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'overview',  label: 'Overview',  icon: LayoutGrid,     show: true },
    { id: 'academics', label: 'Academics', icon: GraduationCap,  show: true },
    { id: 'finance',   label: 'Finance',   icon: Wallet,         show: !!flags.finance },
    { id: 'activity',  label: 'Activity',  icon: Activity,       show: true },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-7 text-white shadow-lg sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute right-24 top-8 h-28 w-28 rounded-full border border-white/10" />
          <div className="absolute right-36 top-16 h-28 w-28 rounded-full border border-white/10" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> {greeting()}
            </p>
            <h2 className="mt-1.5 font-display text-3xl">{schoolName}</h2>
            <p className="mt-1 text-sm text-brand-100/90">
              School Admin · {(tier ?? '').replace(/_/g, ' ')} Plan
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <CalendarDays className="h-4 w-4 text-brand-200" />
            {todayLabel()}
          </div>
        </div>

        {/* Glass quick actions */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          <HeroAction to="/attendance" icon={ClipboardList} label="Mark Attendance" />
          <HeroAction to="/academics"  icon={BookOpen}      label="Report Cards" />
          {flags.finance && <HeroAction to="/finance" icon={Banknote} label="Create Invoice" />}
          <HeroAction to="/learning"   icon={NotebookPen}   label="Post Assignment" />
          <HeroAction to="/notices"    icon={Bell}          label="Post Notice" />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Dashboard sections" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
        {tabs.filter(t => t.show).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === id
                ? 'bg-brand-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Total Students"
              value={stats?.studentCount?.toString() ?? '—'}
              sub="Enrolled this session"
            />
            <KpiCard
              icon={ClipboardList}
              label="Attendance"
              value={stats?.attendancePct != null ? `${stats.attendancePct}%` : lastTrendPct != null ? `${lastTrendPct}%` : '—'}
              sub={stats?.attendancePct != null ? 'Marked today' : 'Last marked day'}
              delta={trendDelta}
              spark={trend.map(t => t.pct)}
            />
            <KpiCard
              icon={Wallet}
              label="Fees Collected"
              value={money(collected)}
              sub={`${collectedPct}% of ${money(invoiced)}`}
              progress={collectedPct}
            />
            <KpiCard
              icon={Banknote}
              label="Outstanding"
              value={money(outstanding)}
              sub={outstanding > 0 ? 'Awaiting payment' : 'All settled'}
              tone={outstanding > 0 ? 'warn' : 'brand'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Attendance Trend" subtitle="School-wide, last marked days" />
              {trend.length >= 2
                ? <TrendChart data={trend} />
                : <ChartEmpty message="Mark attendance on at least two days to see the trend." />}
            </Card>

            <Card>
              <CardHeader title="Today at a Glance" subtitle={stats?.attendanceMarked ? 'Attendance marked' : 'Attendance not marked yet'} />
              <div className="flex flex-col items-center gap-3 py-1">
                <RadialGauge pct={gaugePct} label={stats?.attendanceMarked ? 'present today' : 'last marked day'} />
                <Link
                  to="/attendance"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {stats?.attendanceMarked ? 'Review Attendance' : 'Mark Now'}
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Academics ────────────────────────────────────────────────────── */}
      {tab === 'academics' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Students by Class"
                subtitle="Current session"
                action={<Link to="/academics" className="flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:underline">Report cards <ArrowUpRight className="h-3 w-3" /></Link>}
              />
              <BarList
                items={(stats?.classDistribution ?? []).map(c => ({ label: c.name, value: c.count }))}
                total={stats?.studentCount ?? 0}
                emptyMessage="No classes in the current session."
              />
            </Card>

            <Card>
              <CardHeader title="Quick Links" subtitle="Academic tools" />
              <div className="space-y-2">
                <QuickAction to="/academics"  icon={BookOpen}      label="Generate Report Cards" />
                <QuickAction to="/learning"   icon={NotebookPen}   label="Notes & Assignments" />
                <QuickAction to="/attendance" icon={ClipboardList} label="Attendance Register" />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Grading Scale" subtitle="WAEC standard bands used on report cards" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {GRADE_BANDS.map(b => (
                <div key={b.grade} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-center">
                  <span
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.grade}
                  </span>
                  <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-slate-700">{b.range}</p>
                  <p className="text-[10px] text-slate-400">{b.remark}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Finance ──────────────────────────────────────────────────────── */}
      {tab === 'finance' && (
        <div className="animate-fade-in grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Fee Collection" subtitle="Current session" />
            <div className="flex flex-col items-center gap-4 py-2">
              <Donut pct={collectedPct} />
              <div className="w-full space-y-2">
                <LegendRow color="bg-brand-600" label="Collected" value={money(collected)} />
                <LegendRow color="bg-amber-400" label="Outstanding" value={money(outstanding)} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Breakdown" subtitle="Invoiced vs realised" />
            <div className="space-y-5 py-1">
              <MoneyBar label="Total Invoiced" amount={invoiced}    max={invoiced} barClass="bg-slate-300" />
              <MoneyBar label="Collected"      amount={collected}   max={invoiced} barClass="bg-brand-600" />
              <MoneyBar label="Outstanding"    amount={outstanding} max={invoiced} barClass="bg-amber-400" />
            </div>
            <Link
              to="/finance"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              Open Finance <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card>
            <CardHeader
              title="Recent Payments"
              subtitle="Latest confirmed"
              action={<Link to="/finance" className="flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:underline">View all <ArrowUpRight className="h-3 w-3" /></Link>}
            />
            <PaymentList payments={stats?.recentPayments ?? []} />
          </Card>
        </div>
      )}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="animate-fade-in grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Payment Timeline" subtitle="Most recent first" />
            <PaymentTimeline payments={stats?.recentPayments ?? []} />
          </Card>

          <Card>
            <CardHeader
              title="Notice Board"
              subtitle={`${stats?.noticeCount ?? 0} notice${(stats?.noticeCount ?? 0) !== 1 ? 's' : ''} published`}
              action={<Link to="/notices" className="flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:underline">Manage <ArrowUpRight className="h-3 w-3" /></Link>}
            />
            <NoticeAccordion notices={stats?.recentNotices ?? []} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Hero pieces ───────────────────────────────────────────────────────────────

function HeroAction({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

// ── KPI card with delta / sparkline / progress ────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, tone = 'brand', delta, spark, progress }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  tone?: 'brand' | 'warn'; delta?: number | null; spark?: number[]; progress?: number;
}) {
  const tile = tone === 'warn' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-700';
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {delta != null && delta !== 0 && <DeltaBadge delta={delta} />}
        {spark && spark.length >= 2 && delta == null && <Sparkline data={spark} />}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className={`truncate text-2xl font-bold tracking-tight ${tone === 'warn' ? 'text-amber-600' : 'text-slate-900'}`}>
          {value}
        </p>
        {spark && spark.length >= 2 && delta != null && <Sparkline data={spark} />}
      </div>
      {progress != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {sub && <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
      up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{delta}%
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const W = 72, H = 26, P = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1);
  const y = (v: number) => H - P - ((v - min) * (H - 2 * P)) / range;
  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} aria-hidden="true" className="flex-shrink-0">
      <polyline points={points} fill="none" stroke="rgb(var(--brand-600))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="2.5" fill="rgb(var(--brand-600))" />
    </svg>
  );
}

// ── Infographic components ────────────────────────────────────────────────────

function RadialGauge({ pct, label }: { pct: number | null; label: string }) {
  const R = 62, SW = 13, CX = 80, CY = 80;
  const circ = 2 * Math.PI * R;
  const value = pct ?? 0;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={pct != null ? `${pct}% ${label}` : 'No data'}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={SW} />
      {pct != null && (
        <circle
          cx={CX} cy={CY} r={R} fill="none"
          stroke="rgb(var(--brand-600))" strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      )}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f172a">
        {pct != null ? `${pct}%` : '—'}
      </text>
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize="9.5" fill="#64748b">{label}</text>
    </svg>
  );
}

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
          <stop offset="0%" stopColor="rgb(var(--brand-700))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--brand-700))" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 50, 100].map(g => (
        <g key={g}>
          <line x1={PX} y1={y(g)} x2={W - PX} y2={y(g)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={g === 0 ? undefined : '3 4'} />
          <text x={W - PX + 4} y={y(g) + 3} fontSize="9" fill="#94a3b8">{g}%</text>
        </g>
      ))}

      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" stroke="rgb(var(--brand-700))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.pct)} r="4" fill="#ffffff" stroke="rgb(var(--brand-700))" strokeWidth="2.5" />
          <text x={x(i)} y={y(d.pct) - 9} fontSize="9.5" fontWeight="600" fill="rgb(var(--brand-800))" textAnchor="middle">{d.pct}%</text>
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
        stroke="rgb(var(--brand-700))" strokeWidth={SW} strokeLinecap="round"
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

function BarList({ items, total, emptyMessage }: { items: { label: string; value: number }[]; total?: number; emptyMessage: string }) {
  if (!items.length) return <ChartEmpty message={emptyMessage} />;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-4">
      {items.map(it => {
        const pctOfSchool = total ? Math.round((it.value / total) * 100) : null;
        return (
          <div key={it.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{it.label}</span>
              <span className="text-xs font-semibold text-slate-500">
                {it.value} students{pctOfSchool != null ? ` · ${pctOfSchool}%` : ''}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                style={{ width: `${(it.value / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MoneyBar({ label, amount, max, barClass }: { label: string; amount: number; max: number; barClass: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((amount / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{money(amount)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Activity components ───────────────────────────────────────────────────────

function PaymentList({ payments }: { payments: RecentPayment[] }) {
  if (!payments.length) return <ChartEmpty message="No payments recorded yet." />;
  return (
    <ul className="divide-y divide-slate-50">
      {payments.map((p, i) => (
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
  );
}

function PaymentTimeline({ payments }: { payments: RecentPayment[] }) {
  if (!payments.length) return <ChartEmpty message="No payments recorded yet." />;
  return (
    <ol className="relative ml-3 space-y-5 border-l-2 border-slate-100 pb-1">
      {payments.map((p, i) => (
        <li key={i} className="relative pl-6">
          <span className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-600 shadow-sm" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{p.student}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Paid via {GATEWAY_LABELS[p.gateway] ?? p.gateway} · {p.term} term · {shortDate(p.paidAt)}
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              {money(p.amount)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NoticeAccordion({ notices }: { notices: RecentNotice[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!notices.length) return <ChartEmpty message="No notices published yet." />;
  return (
    <div className="space-y-2">
      {notices.map(n => {
        const isOpen = open === n.id;
        return (
          <div key={n.id} className={`rounded-xl border transition-colors ${isOpen ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
            <button
              onClick={() => setOpen(isOpen ? null : n.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
            >
              {n.isPinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />}
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CAT_COLORS[n.category] ?? 'bg-slate-100 text-slate-600'}`}>
                {n.category}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{n.title}</span>
              <span className="flex-shrink-0 text-xs text-slate-400">{shortDate(n.publishedAt)}</span>
              {isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />}
            </button>
            {isOpen && n.body && (
              <p className="whitespace-pre-wrap border-t border-brand-100 px-4 pb-3.5 pt-3 text-sm leading-relaxed text-slate-600">
                {n.body}
              </p>
            )}
          </div>
        );
      })}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/attendance" icon={ClipboardList} label="Attendance" />
        <QuickAction to="/academics"  icon={BookOpen}      label="Report Cards" />
        <QuickAction to="/learning"   icon={NotebookPen}   label="Learning" />
        <QuickAction to="/notices"    icon={Bell}          label="Notices" />
      </div>

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/academics" icon={BookOpen}    label="My Grades" />
        <QuickAction to="/learning"  icon={NotebookPen} label="Assignments" />
        <QuickAction to="/finance"   icon={Banknote}    label="My Fees" />
        <QuickAction to="/notices"   icon={Bell}        label="Notices" />
      </div>

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
