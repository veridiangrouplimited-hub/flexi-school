import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-800">Payment cancelled</h2>
        <p className="mt-1 text-sm text-slate-500">
          No charge was made. You can try again whenever you're ready.
        </p>
        <Link
          to="/finance"
          className="mt-6 inline-block rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Back to Finance
        </Link>
      </div>
    </div>
  );
}
