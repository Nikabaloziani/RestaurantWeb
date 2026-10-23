import type { LucideIcon } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, hint, accent = 'blue' }: {
  label: string; value: string; icon: LucideIcon; hint?: string; accent?: 'blue' | 'green' | 'amber' | 'violet';
}) {
  const accents = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}><Icon size={20} aria-hidden="true" /></span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[29px]">{value}</div>
      {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
    </div>
  );
}
