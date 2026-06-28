import { Trophy, Construction } from 'lucide-react';

export function SportsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Trophy className="h-6 w-6 text-slate-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-700">Sports</h2>
        <p className="mt-1 text-sm text-slate-400">Sports houses, events, and results coming soon.</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-600">
        <Construction className="h-3 w-3" />
        Under construction
      </div>
    </div>
  );
}
