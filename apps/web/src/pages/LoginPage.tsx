import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, Loader2,
  BookOpen, ClipboardCheck, Banknote, NotebookPen, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTenantStore } from '../stores/tenantStore';
import { useThemeStore, THEMES } from '../stores/themeStore';
import type { TenantState } from '../context/TenantContext';

const FEATURES = [
  { icon: BookOpen,       text: 'Academics, scores & one-click report cards' },
  { icon: ClipboardCheck, text: 'Daily attendance with printable registers' },
  { icon: Banknote,       text: 'Fees, invoicing & online payments' },
  { icon: NotebookPen,    text: 'Class notes, assignments & marking' },
];

const DEMO_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@demo.flexischool.app',    password: 'Admin1234!' },
  { label: 'Teacher', email: 'teacher@demo.flexischool.app',  password: 'Teacher1234!' },
  { label: 'Student', email: 'student1@demo.flexischool.app', password: 'Student1234!' },
];

export function LoginPage() {
  const navigate        = useNavigate();
  const { setSession }  = useAuthStore();
  const { setTenant }   = useTenantStore();
  const { theme, setTheme } = useThemeStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Login failed');
        return;
      }

      setSession({
        userId:      data.user.id,
        role:        data.user.role,
        permissions: data.user.permissions,
        tenantId:    data.user.tenantId,
        token:       data.token,
      });
      setTenant(data.tenant as TenantState);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-12 text-white lg:flex">
        {/* Decorative orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute right-16 top-24 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute right-28 top-36 h-40 w-40 rounded-full border border-white/10" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-display text-2xl">FlexiSchool</span>
        </div>

        {/* Headline + features */}
        <div className="relative max-w-md">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
            <Sparkles className="h-3.5 w-3.5" /> School management, reimagined
          </p>
          <h1 className="font-display text-4xl leading-tight">
            Run your entire school from one beautiful place.
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-brand-50/90">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <div className="relative flex items-center gap-2 text-xs text-brand-200/80">
          <ShieldCheck className="h-4 w-4" />
          Multi-tenant · Role-based access · Bank-grade security
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-slate-50/60 px-4 py-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl text-slate-900">FlexiSchool</h1>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-card-lg sm:p-10">
            <h2 className="font-display text-2xl text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your school portal to continue.</p>

            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              {error && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    required
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-11 text-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-700/25 transition-all hover:bg-brand-800 hover:shadow-brand-800/25 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {/* Demo quick-fill */}
            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="mb-2.5 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Try a demo account
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(''); }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Click a role to fill the form, then sign in.
              </p>
            </div>
          </div>

          {/* Theme picker */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="mr-1 text-xs text-slate-400">Theme</span>
            {THEMES.map(t => (
              <button
                key={t.name}
                onClick={() => setTheme(t.name)}
                title={t.label}
                aria-label={`Switch to ${t.label} theme`}
                aria-pressed={theme === t.name}
                className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                  theme === t.name ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                }`}
                style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-brand-700">FlexiSchool</span>
          </p>
        </div>
      </div>
    </div>
  );
}
