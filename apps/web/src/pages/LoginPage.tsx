import { useState, type FormEvent } from 'react';
import { GraduationCap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTenantStore } from '../stores/tenantStore';
import type { TenantState } from '../context/TenantContext';

export function LoginPage() {
  const { setSession }  = useAuthStore();
  const { setTenant }   = useTenantStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">FlexiSchool</h1>
          <p className="text-sm text-slate-500">Sign in to your school portal</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.edu"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Demo: admin@demo.flexischool.app / Admin1234!
          </p>
        </div>
      </div>
    </div>
  );
}
