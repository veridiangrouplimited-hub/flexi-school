import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const invoiceId = params.get('invoiceId');
  const orderId   = params.get('token'); // PayPal passes the order ID as `token`

  const token    = useAuthStore(s => s.token);
  const tenantId = useAuthStore(s => s.tenantId);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!invoiceId || !orderId) {
      setStatus('error');
      setMessage('Missing payment details in URL.');
      return;
    }

    fetch(`/api/finance/invoices/${invoiceId}/capture`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        'X-Tenant-ID':  tenantId ?? '',
      },
      body: JSON.stringify({ orderId }),
    })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(() => setStatus('success'))
      .catch(e  => { setStatus('error'); setMessage(e?.message ?? 'Capture failed.'); });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-brand-700" />
            <h2 className="text-lg font-semibold text-slate-800">Confirming your payment…</h2>
            <p className="mt-1 text-sm text-slate-500">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold text-slate-800">Payment successful!</h2>
            <p className="mt-1 text-sm text-slate-500">Your invoice has been marked as paid.</p>
            <Link
              to="/finance"
              className="mt-6 inline-block rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Back to Finance
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-800">Payment confirmation failed</h2>
            <p className="mt-1 text-sm text-red-500">{message}</p>
            <Link
              to="/finance"
              className="mt-6 inline-block rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Finance
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
