import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Pin, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Notice {
  id: string; title: string; body: string;
  category: string; isPinned: boolean; publishedAt: string;
  expiresAt: string | null; author: string;
}

const CAT_STYLES: Record<string, string> = {
  GENERAL:   'bg-slate-100 text-slate-700',
  ACADEMIC:  'bg-blue-100 text-blue-700',
  FINANCE:   'bg-green-100 text-green-700',
  HOSTEL:    'bg-amber-100 text-amber-700',
  SPORTS:    'bg-purple-100 text-purple-700',
  EMERGENCY: 'bg-red-100 text-red-800',
};

export function NoticesPage() {
  const can = useAuthStore(s => s.can);
  const qc  = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', body: '', category: 'GENERAL',
    isPinned: false, expiresAt: '',
  });

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn:  () => api.get('/api/notices'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/notices', {
      ...form,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    }),
    onSuccess: () => {
      toast.success('Notice published');
      qc.invalidateQueries({ queryKey: ['notices'] });
      setShowForm(false);
      setForm({ title: '', body: '', category: 'GENERAL', isPinned: false, expiresAt: '' });
    },
    onError: () => toast.error('Failed to publish notice'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/notices/${id}`),
    onSuccess: () => { toast.success('Notice deleted'); qc.invalidateQueries({ queryKey: ['notices'] }); },
    onError:   () => toast.error('Failed to delete notice'),
  });

  const canAdmin = can('settings:write');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-900">Notice Board</h2>
        </div>
        {canAdmin && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Notice'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800">New Notice</h3>
          <input
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <textarea
            placeholder="Body *"
            rows={4}
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            >
              {Object.keys(CAT_STYLES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                className="rounded border-slate-300 accent-brand-700"
              />
              Pin to top
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Expires</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={!form.title || !form.body || create.isPending}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {create.isPending ? 'Publishing…' : 'Publish Notice'}
          </button>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {!isLoading && notices.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          No notices posted yet.
        </div>
      )}

      <div className="space-y-3">
        {notices.map(n => (
          <div
            key={n.id}
            className={`rounded-xl border bg-white shadow-sm ${n.isPinned ? 'border-brand-200' : 'border-slate-200'}`}
          >
            <div
              className="flex cursor-pointer items-start gap-3 px-5 py-4"
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
            >
              {n.isPinned && <Pin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CAT_STYLES[n.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {n.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(n.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-slate-400">· {n.author}</span>
                </div>
                <p className="font-medium text-slate-800">{n.title}</p>
                {expanded !== n.id && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{n.body}</p>
                )}
              </div>
              {canAdmin && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm('Delete this notice?')) remove.mutate(n.id);
                  }}
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {expanded === n.id && (
              <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                {n.expiresAt && (
                  <p className="mt-3 text-xs text-slate-400">
                    Expires: {new Date(n.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
