export default function MiniChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#f59e0b', '#10b981', '#f43f5e'];
  let offset = 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`Withdrawal status distribution across ${total} requests`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {total > 0 && items.map((item, index) => {
            const length = (item.value / total) * circumference;
            const segment = <circle key={item.label} cx="50" cy="50" r={radius} fill="none" stroke={colors[index % colors.length]} strokeWidth="12" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} strokeLinecap="round" />;
            offset += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] font-medium text-slate-500">requests</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-1 gap-3">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.label}</span>
            <span className="font-semibold tabular-nums text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
