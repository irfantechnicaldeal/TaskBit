import { Menu, RefreshCw } from 'lucide-react';

const tabTitles = {
  dashboard: ['Dashboard', 'A clear view of your TaskBit platform.'],
  users: ['Users', 'Manage accounts and review user activity.'],
  withdrawals: ['Withdrawals', 'Review and process payout requests.'],
  tasks: ['Tasks', 'Manage rewards available to your users.'],
  transactions: ['Transactions', 'Review transaction activity.'],
  'bank-details': ['Bank details', 'Review registered payout information.'],
  settings: ['Settings', 'Manage your administrator account.']
};

export default function Topbar({ currentTab, adminProfile, loading, onRefresh, onMenu }) {
  const [title, subtitle] = tabTitles[currentTab] || tabTitles.dashboard;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Open navigation" onClick={onMenu} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden">
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60 sm:px-3.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Syncing' : 'Refresh data'}</span>
          </button>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="hidden text-right sm:block">
            <p className="max-w-44 truncate text-xs font-bold text-slate-800">{adminProfile.name}</p>
            <p className="max-w-44 truncate text-[11px] text-slate-500">{adminProfile.email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-[11px] font-bold text-white ring-4 ring-blue-50">TB</div>
        </div>
      </div>
    </header>
  );
}
