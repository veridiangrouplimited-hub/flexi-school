import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CheckCircle, Clock, AlertCircle, CreditCard, Banknote as Cash, Plus, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface FeeCategory { id: string; name: string; defaultAmount: number | null; description: string | null; }
interface StudentItem { id: string; admissionNo: string; name: string; }
interface InvoiceItem { id: string; category: string; description: string | null; amount: number; }
interface InvoicePmt  { amount: number; paidAt: string | null; gateway: string; }
interface Invoice {
  id: string; studentName: string; admissionNo: string;
  session: string; sessionId: string; term: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  totalAmount: number; dueDate: string | null; currency: string;
  items: InvoiceItem[]; payments: InvoicePmt[]; createdAt: string;
}
interface Summary { totalInvoiced: number; totalPaid: number; outstanding: number; overdue: number; currency: string; }
interface Session  { id: string; name: string; isCurrent: boolean; }

export function FinancePage() {
  const can = useAuthStore(s => s.can);
  const qc  = useQueryClient();
  const [sessionId, setSessionId]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: sessions   = [] } = useQuery<Session[]>({ queryKey: ['sessions'],    queryFn: () => api.get('/api/academic/sessions') });
  const { data: categories = [] } = useQuery<FeeCategory[]>({ queryKey: ['fee-categories'], queryFn: () => api.get('/api/finance/categories') });
  const { data: students   = [] } = useQuery<StudentItem[]>({ queryKey: ['students'],      queryFn: () => api.get('/api/academic/students') });
  const sid = sessionId || sessions.find(s => s.isCurrent)?.id || '';

  const { data: summary } = useQuery<Summary>({
    queryKey: ['finance-summary', sid],
    queryFn:  () => api.get(`/api/finance/summary${sid ? `?sessionId=${sid}` : ''}`),
    enabled:  true,
  });

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', sid, statusFilter],
    queryFn:  () => api.get(`/api/finance/invoices?${new URLSearchParams({ ...(sid ? { sessionId: sid } : {}), ...(statusFilter ? { status: statusFilter } : {}) }).toString()}`),
  });

  const checkout = useMutation({
    mutationFn: ({ invoiceId, gateway }: { invoiceId: string; gateway: string }) =>
      api.post<{ approvalUrl?: string; success?: boolean; gateway?: string }>(`/api/finance/invoices/${invoiceId}/checkout`, { gateway }),
    onSuccess: (data, { invoiceId, gateway }) => {
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        // Cash/bank — immediately refetch
        qc.invalidateQueries({ queryKey: ['invoices'] });
        qc.invalidateQueries({ queryKey: ['finance-summary'] });
      }
    },
  });

  const cur = summary?.currency ?? 'USD';
  const canWrite = can('finance:write');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-900">Finance</h2>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? 'Cancel' : 'New Invoice'}
          </button>
        )}
      </div>

      {/* Create invoice form */}
      {showCreate && (
        <CreateInvoiceForm
          sessions={sessions}
          students={students}
          categories={categories}
          currentSessionId={sid}
          onSuccess={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['finance-summary'] });
          }}
        />
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SumCard label="Total Invoiced" value={fmt(summary.totalInvoiced, cur)} color="slate" />
          <SumCard label="Collected"      value={fmt(summary.totalPaid, cur)}     color="green" />
          <SumCard label="Outstanding"    value={fmt(summary.outstanding, cur)}   color="amber" />
          <SumCard label="Overdue"        value={String(summary.overdue)}         color={summary.overdue > 0 ? 'red' : 'slate'} suffix=" invoices" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PARTIAL">Partial</option>
        </select>
      </div>

      {/* Invoice list */}
      {isLoading && <p className="text-sm text-slate-500">Loading invoices…</p>}

      {!isLoading && invoices.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          No invoices found.
        </div>
      )}

      <div className="space-y-3">
        {invoices.map(inv => (
          <div key={inv.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Row */}
            <div
              className="flex cursor-pointer items-center gap-4 px-5 py-4"
              onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
            >
              <StatusIcon status={inv.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{inv.studentName}</p>
                <p className="text-xs text-slate-500">{inv.admissionNo} · {inv.session} · {inv.term} Term</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{fmt(inv.totalAmount, inv.currency)}</p>
                {inv.dueDate && (
                  <p className="text-xs text-slate-400">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                )}
              </div>
              <StatusBadge status={inv.status} />
            </div>

            {/* Expanded detail */}
            {expanded === inv.id && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                {/* Items table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-4">Item</th>
                      <th className="pb-2 pr-4">Description</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inv.items.map(it => (
                      <tr key={it.id}>
                        <td className="py-1.5 pr-4 font-medium text-slate-700">{it.category}</td>
                        <td className="py-1.5 pr-4 text-slate-500">{it.description ?? '—'}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(it.amount, inv.currency)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-semibold">
                      <td className="pt-2 pr-4" colSpan={2}>Total</td>
                      <td className="pt-2 text-right">{fmt(inv.totalAmount, inv.currency)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment history */}
                {inv.payments.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment history</p>
                    {inv.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm text-slate-600">
                        <span>{p.gateway.replace('_', ' ')} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'pending'}</span>
                        <span className="font-medium">{fmt(p.amount, inv.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {(inv.status === 'UNPAID' || inv.status === 'OVERDUE' || inv.status === 'PARTIAL') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => checkout.mutate({ invoiceId: inv.id, gateway: 'PAYPAL' })}
                      disabled={checkout.isPending}
                      className="flex items-center gap-2 rounded-lg bg-[#0070ba] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay with PayPal
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Mark this invoice as paid by cash?')) {
                          checkout.mutate({ invoiceId: inv.id, gateway: 'CASH' });
                        }
                      }}
                      disabled={checkout.isPending}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Cash className="h-4 w-4" />
                      Mark Paid (Cash)
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Mark as paid by bank transfer?')) {
                          checkout.mutate({ invoiceId: inv.id, gateway: 'BANK_TRANSFER' });
                        }
                      }}
                      disabled={checkout.isPending}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      Bank Transfer
                    </button>
                  </div>
                )}

                {inv.status === 'PAID' && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Payment received — thank you!
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function SumCard({ label, value, color, suffix = '' }: { label: string; value: string; color: string; suffix?: string }) {
  const colors: Record<string, string> = {
    slate: 'text-slate-900',
    green: 'text-green-700',
    amber: 'text-amber-600',
    red:   'text-red-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${colors[color] ?? 'text-slate-900'}`}>{value}{suffix}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'PAID')    return <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />;
  if (status === 'OVERDUE') return <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />;
  return <Clock className="h-5 w-5 flex-shrink-0 text-amber-400" />;
}

// ── Create Invoice Form ───────────────────────────────────────────────────────

interface CreateFormProps {
  sessions:         Session[];
  students:         StudentItem[];
  categories:       FeeCategory[];
  currentSessionId: string;
  onSuccess:        () => void;
}

function CreateInvoiceForm({ sessions, students, categories, currentSessionId, onSuccess }: CreateFormProps) {
  const [studentId, setStudentId] = useState('');
  const [sessionId, setSessionId] = useState(currentSessionId || '');
  const [term, setTerm]           = useState<'FIRST' | 'SECOND' | 'THIRD'>('FIRST');
  const [dueDate, setDueDate]     = useState('');
  const [notes, setNotes]         = useState('');
  const [items, setItems]         = useState<{ feeCategoryId: string; description: string; amount: string }[]>([
    { feeCategoryId: '', description: '', amount: '' },
  ]);

  const create = useMutation({
    mutationFn: () => api.post('/api/finance/invoices', {
      studentId,
      sessionId,
      term,
      dueDate: dueDate || undefined,
      notes:   notes   || undefined,
      items:   items.filter(i => i.feeCategoryId && Number(i.amount) > 0).map(i => ({
        feeCategoryId: i.feeCategoryId,
        description:   i.description || undefined,
        amount:        Number(i.amount),
      })),
    }),
    onSuccess,
  });

  const addItem  = () => setItems(it => [...it, { feeCategoryId: '', description: '', amount: '' }]);
  const removeIt = (i: number) => setItems(it => it.filter((_, idx) => idx !== i));
  const setItem  = (i: number, field: string, val: string) =>
    setItems(it => it.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const applyDefault = (i: number, catId: string) => {
    const cat = categories.find(c => c.id === catId);
    setItems(it => it.map((row, idx) => idx === i
      ? { ...row, feeCategoryId: catId, amount: cat?.defaultAmount?.toString() ?? row.amount }
      : row,
    ));
  };

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const valid = studentId && sessionId && items.some(i => i.feeCategoryId && Number(i.amount) > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-slate-800">New Invoice</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Student *</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
            <option value="">Select student…</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Session *</label>
          <select value={sessionId} onChange={e => setSessionId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
            <option value="">Select session…</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Term *</label>
          <select value={term} onChange={e => setTerm(e.target.value as 'FIRST' | 'SECOND' | 'THIRD')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
            <option value="FIRST">First Term</option>
            <option value="SECOND">Second Term</option>
            <option value="THIRD">Third Term</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
        </div>
      </div>

      {/* Line items */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Line Items</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={item.feeCategoryId}
                onChange={e => applyDefault(i, e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                <option value="">Category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Description (optional)" value={item.description}
                onChange={e => setItem(i, 'description', e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
              <input type="number" placeholder="Amount" value={item.amount} min={0}
                onChange={e => setItem(i, 'amount', e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
              {items.length > 1 && (
                <button onClick={() => removeIt(i)} className="rounded-lg p-2 text-slate-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-2 flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add line item
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold text-slate-800">
          Total: <span className="text-brand-700">{fmt(total, 'USD')}</span>
        </p>
        <button
          onClick={() => create.mutate()}
          disabled={!valid || create.isPending}
          className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {create.isPending ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID:      'bg-green-100 text-green-800',
    UNPAID:    'bg-amber-100 text-amber-800',
    OVERDUE:   'bg-red-100 text-red-800',
    PARTIAL:   'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
