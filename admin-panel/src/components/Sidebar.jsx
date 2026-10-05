import {
  Activity,
  ArrowLeftRight,
  CheckSquare,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wallet,
  X
} from 'lucide-react';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'bank-details', label: 'Bank details', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ currentTab, setCurrentTab, pendingCount, onLogout, mobileOpen, onClose }) {
  const selectTab = (tab) => {
    setCurrentTab(tab);
    onClose();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,280px)] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-[260px] md:translate-x-0 md:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-900/40">
              <Activity size={21} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight text-white">TaskBit <span className="text-blue-400">Admin</span></p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rewards platform</p>
            </div>
          </div>
          <button type="button" aria-label="Close navigation" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => selectTab(id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold transition ${active ? 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/20' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}
              >
                <Icon size={18} className={active ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {id === 'withdrawals' && pendingCount > 0 && (
                  <span className="min-w-6 rounded-full bg-amber-400/15 px-2 py-0.5 text-center text-[11px] font-bold text-amber-300">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">TB</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200">TaskBit workspace</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Administrator access</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300">
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
