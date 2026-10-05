export default function StatusBadge({ status, children }) {
  const value = status || children || 'Unknown';
  const normalized = String(value).toLowerCase();
  const tone = normalized.includes('approv') || normalized === 'active' || normalized === 'completed'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : normalized.includes('reject') || normalized === 'inactive' || normalized === 'paused'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : normalized.includes('pending') || normalized.includes('review')
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';

  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{value}</span>;
}
