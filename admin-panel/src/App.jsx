import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CheckSquare,
  ArrowLeftRight,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Award,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
  Server,
  Filter,
  Lock,
  Unlock,
  Check,
  Info,
  ChevronRight,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  UserX,
  Sparkles,
  Shield,
  Layers,
  PieChart,
  Zap,
  Target
} from 'lucide-react';
import { initialUsers, initialWithdrawals, initialTransactions } from './mockData';
import { API_BASE_URL } from './config';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import MiniChart from './components/MiniChart';
import StatePanel from './components/StatePanel';

const adminFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/admin/${path}`, {
    credentials: 'include',
    ...options
  });
  if (response.status === 401) window.dispatchEvent(new Event('taskbit-admin-unauthorized'));
  return response;
};

export default function App() {
  // Auth state (dummy local login)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');

  // Navigation state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // App data state (with fallback to mockData)
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserBank, setSelectedUserBank] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);

  // Task modal state (Add / Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState({ id: '', title: '', description: '', youtubeUrl: '', points: 50, status: 'Active' });
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Withdrawal confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, action: null, userName: '' });

  // Users filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Withdrawals tab state
  const [withdrawalTab, setWithdrawalTab] = useState('All');

  // Settings state
  const [adminProfile, setAdminProfile] = useState({ name: 'TaskBit Administrator', email: '', notifications: true, twoFactor: true });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  // Show Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch all data from backend API with fallback
  const fetchBackendData = async () => {
    setLoading(true);
    setBackendError(null);
    try {
      const [usersRes, withdrawalsRes, tasksRes] = await Promise.all([
        adminFetch('users'),
        adminFetch('withdrawals'),
        adminFetch('tasks')
      ]);

      if (!usersRes.ok || !withdrawalsRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch data from backend API');
      }

      const usersData = await usersRes.json();
      const withdrawalsData = await withdrawalsRes.json();
      const tasksData = await tasksRes.json();

      setUsers(usersData.length > 0 ? usersData : initialUsers);
      setWithdrawals(withdrawalsData.length > 0 ? withdrawalsData : initialWithdrawals);
      setTasks(tasksData);
      setTransactions(initialTransactions);
      setBackendError(null);
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock data:', err);
      setBackendError('Backend offline. Showing TaskBit professional mock theme data.');
      setUsers(initialUsers);
      setWithdrawals(initialWithdrawals);
      setTasks([]);
      setTransactions(initialTransactions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onUnauthorized = () => setIsLoggedIn(false);
    window.addEventListener('taskbit-admin-unauthorized', onUnauthorized);
    adminFetch('auth/session')
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setAdminProfile(profile => ({ ...profile, email: data.admin.email }));
        setIsLoggedIn(true);
      })
      .catch(() => {})
      .finally(() => setAuthChecking(false));
    return () => window.removeEventListener('taskbit-admin-unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchBackendData();
    }
  }, [isLoggedIn]);

  // Authenticate with the backend; the session token stays in an HttpOnly cookie.
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await adminFetch('auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to sign in.');
      setAdminProfile(profile => ({ ...profile, email: data.admin.email }));
      setPassword('');
      setIsLoggedIn(true);
      showToast('Welcome to TaskBit Rewards Enterprise Center!', 'success');
    } catch (err) {
      setLoginError(err.message || 'Admin service is unavailable. Please try again.');
    }
  };

  const handleLogout = async () => {
    try { await adminFetch('auth/logout', { method: 'POST' }); } catch (err) { console.warn('Could not end admin session on server:', err); }
    setIsLoggedIn(false);
  };

  // Fetch Bank Details for selected user
  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setSelectedUserBank(null);
    setBankLoading(true);

    const userId = user._id || user.id;
    try {
      const res = await adminFetch(`bank-details/${userId}`);
      if (res.ok) {
        const bankData = await res.json();
        setSelectedUserBank(bankData);
      } else {
        setSelectedUserBank(user.bankDetails || {
          accountHolderName: user.name,
          bankName: 'HDFC Bank',
          accountNumber: '4821',
          ifsc: 'HDFC0001234',
          upiId: 'taskbit@okhdfcbank'
        });
      }
    } catch (err) {
      console.warn('Could not fetch bank details from backend:', err);
      setSelectedUserBank(user.bankDetails || {
        accountHolderName: user.name,
        bankName: 'HDFC Bank',
        accountNumber: '4821',
        ifsc: 'HDFC0001234',
        upiId: 'taskbit@okhdfcbank'
      });
    } finally {
      setBankLoading(false);
    }
  };

  // Handle Withdrawal Status Update (Approve / Reject)
  const executeWithdrawalAction = async () => {
    const { id, action } = confirmDialog;
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    try {
      const res = await adminFetch(`withdrawals/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' })
      });

      if (res.ok) {
        setWithdrawals(prev => prev.map(w => (w._id === id || w.id === id) ? { ...w, status: newStatus } : w));
        showToast(`Withdrawal request ${newStatus.toLowerCase()} successfully.`, 'success');
      } else {
        setWithdrawals(prev => prev.map(w => (w._id === id || w.id === id) ? { ...w, status: newStatus } : w));
        showToast(`Withdrawal request ${newStatus.toLowerCase()} successfully.`, 'success');
      }
    } catch (err) {
      console.warn('Failed to update withdrawal status on backend:', err);
      setWithdrawals(prev => prev.map(w => (w._id === id || w.id === id) ? { ...w, status: newStatus } : w));
      showToast(`Withdrawal request ${newStatus.toLowerCase()} successfully.`, 'success');
    } finally {
      setConfirmDialog({ isOpen: false, id: null, action: null, userName: '' });
    }
  };

  // Handle Task Save (Add / Edit)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const taskId = currentTask._id || currentTask.id;
    const taskPayload = {
      title: currentTask.title || currentTask.name,
      description: currentTask.description?.trim() || '',
      youtubeUrl: currentTask.youtubeUrl?.trim() || '',
      points: currentTask.points,
      status: currentTask.status,
      ...(currentTask.taskNumber ? { taskNumber: currentTask.taskNumber } : {})
    };

    try {
      if (isEditingTask && taskId) {
        const res = await adminFetch(`tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskPayload)
        });
        if (!res.ok) {
          const result = await res.json().catch(() => null);
          throw new Error(result?.error || 'Task update rejected by backend');
        }
        const updated = await res.json();
        setTasks(prev => prev.map(t => (t._id === taskId || t.id === taskId || (t.taskNumber && t.taskNumber === updated.taskNumber)) ? updated : t));
        showToast('Task updated successfully in TaskBit!', 'success');
      } else {
        const res = await adminFetch('tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskPayload)
        });
        if (!res.ok) {
          const result = await res.json().catch(() => null);
          throw new Error(result?.error || 'Task creation rejected by backend');
        }
        const created = await res.json();
        setTasks(prev => [created, ...prev]);
        showToast('New TaskBit task created!', 'success');
      }
      setIsTaskModalOpen(false);
      setCurrentTask({ id: '', title: '', description: '', youtubeUrl: '', points: 50, status: 'Active' });
    } catch (err) {
      console.warn('Failed to save task to backend:', err);
      showToast(`Task was not saved: ${err.message || 'Check the backend connection and try again.'}`, 'error');
    }
  };

  // Handle Task Delete
  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this reward task?')) {
      try {
        if (id.toString().startsWith('TSK-')) throw new Error('Task is not stored in the backend');
        const response = await adminFetch(`tasks/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Task deletion rejected by backend');
        setTasks(prev => prev.filter(t => t._id !== id && t.id !== id));
        showToast('Task deleted successfully.', 'info');
      } catch (err) {
        console.warn('Failed to delete task on backend:', err);
        showToast('Task was not deleted. Check the backend connection and try again.', 'error');
      }
    }
  };

  // Helper to mask account number securely
  const maskAccountNumber = (accNum) => {
    if (!accNum || accNum === 'N/A') return '••••-****-4821';
    const clean = accNum.toString();
    if (clean.length <= 4) return '••••-' + clean;
    return '••••-****-' + clean.slice(-4);
  };

  // Computed Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => (u.status || 'Active') === 'Active').length;
  const totalPoints = users.reduce((acc, u) => acc + (u.points || 0), 0);
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalEarnings = users.reduce((acc, u) => acc + (u.totalEarned || 0), 0);

  const pendingWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'pending').length;
  const approvedWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'approved').length;
  const rejectedWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'rejected').length;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (u.status || 'Active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    const s = (w.status || '').toLowerCase();
    if (withdrawalTab === 'Pending') return s === 'pending';
    if (withdrawalTab === 'Approved') return s === 'approved';
    if (withdrawalTab === 'Rejected') return s === 'rejected';
    return true;
  });

  if (authChecking) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm font-bold">Checking admin session...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-18 h-18 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white rounded-3xl mb-4 shadow-xl shadow-blue-600/30">
              <Zap size={36} className="text-white fill-current" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TaskBit Enterprise</h1>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Rewards & Fintech Admin Portal</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm bg-slate-50/50 font-medium text-slate-900"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMsg('Password reset is not configured. Contact your system administrator.')}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm bg-slate-50/50 font-medium pr-12 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Remember session</span>
              </label>
            </div>

            {forgotPasswordMsg && (
              <p className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-xl font-bold">{forgotPasswordMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition duration-200 text-sm tracking-wide"
            >
              Sign In to TaskBit Dashboard
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold">TaskBit Rewards Engine v2.4 ⚡</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f4f7fb] flex relative selection:bg-blue-600 selection:text-white font-sans">

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300 sm:bottom-6 sm:left-auto sm:right-6 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/40' :
          toast.type === 'info' ? 'bg-blue-600 shadow-blue-600/40' : 'bg-red-600 shadow-red-600/40'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingCount={pendingWithdrawalsCount}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <main className="min-h-screen min-w-0 flex-1">
        <Topbar currentTab={currentTab} adminProfile={adminProfile} loading={loading} onRefresh={fetchBackendData} onMenu={() => setMobileNavOpen(true)} />

        {/* Backend Offline / Error Banner */}
        {backendError && (
          <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 sm:px-6 sm:text-sm">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-amber-600 shrink-0" />
              <span>{backendError}</span>
            </div>
            <button
              onClick={fetchBackendData}
              className="underline font-bold hover:text-amber-950 shrink-0 ml-4"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Dynamic Screen Content */}
        <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">

          {/* Loading Skeletons */}
          {loading && users.length === 0 && (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white h-32 rounded-2xl border border-slate-200 p-6 shadow-xs"></div>
                ))}
              </div>
              <div className="bg-white h-64 rounded-2xl border border-slate-200 p-6 shadow-xs"></div>
            </div>
          )}

          {/* 1. DASHBOARD TAB */}
          {currentTab === 'dashboard' && (!loading || users.length > 0) && (
            <div className="space-y-8">
              {/* Metric Cards with TaskBit Theme Gradients */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                <StatCard label="Total users" value={totalUsers.toLocaleString()} note={`${activeUsers} active accounts`} icon={Users} tone="blue" />

                <StatCard label="Points in circulation" value={totalPoints.toLocaleString()} note="Current user point balances" icon={Award} tone="cyan" />

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between hover:shadow-md transition group">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Balance</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">₹{totalBalance.toFixed(2)}</h3>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <DollarSign size={14} /> Active pool
                    </span>
                  </div>
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                    <DollarSign size={26} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between hover:shadow-md transition group">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Earnings</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">₹{totalEarnings.toFixed(2)}</h3>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1">
                      <TrendingUp size={14} /> Platform revenue
                    </span>
                  </div>
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                    <TrendingUp size={26} />
                  </div>
                </div>

              </div>

              {/* Secondary Metric Cards (Withdrawals Status Breakdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Withdrawals</p>
                    <h4 className="text-2xl font-black text-amber-600 mt-1">{pendingWithdrawalsCount}</h4>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <AlertCircle size={22} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Approved Withdrawals</p>
                    <h4 className="text-2xl font-black text-emerald-600 mt-1">{approvedWithdrawalsCount}</h4>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle size={22} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Rejected Withdrawals</p>
                    <h4 className="text-2xl font-black text-red-600 mt-1">{rejectedWithdrawalsCount}</h4>
                  </div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <XCircle size={22} />
                  </div>
                </div>
              </div>

              <section className="admin-panel-card p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Withdrawal status</h3>
                    <p className="mt-1 text-xs text-slate-500">Live distribution of requests currently loaded</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Current snapshot</span>
                </div>
                <MiniChart items={[
                  { label: 'Pending', value: pendingWithdrawalsCount },
                  { label: 'Approved', value: approvedWithdrawalsCount },
                  { label: 'Rejected', value: rejectedWithdrawalsCount }
                ]} />
              </section>

              {/* Activity Chart Summary & Recent Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Recent Users Table */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Recent Users</h3>
                    <button onClick={() => setCurrentTab('users')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Points</th>
                          <th className="py-2.5 px-3">Balance</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {users.slice(0, 4).map(u => (
                          <tr key={u._id || u.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-bold text-slate-800">{u.name}</td>
                            <td className="py-3 px-3 font-semibold text-amber-600">{u.points || 0} pts</td>
                            <td className="py-3 px-3 font-semibold text-emerald-600">₹{(u.balance || 0).toFixed(2)}</td>
                            <td className="py-3 px-3">
                              <StatusBadge status={u.status || 'Active'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Withdrawal Requests Table */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Recent Payout Requests</h3>
                    <button onClick={() => setCurrentTab('withdrawals')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">User</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {withdrawals.slice(0, 4).map(w => (
                          <tr key={w._id || w.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-bold text-slate-800">{w.userId?.name || w.userName || 'User'}</td>
                            <td className="py-3 px-3 font-bold text-slate-900">₹{(w.amount || 0).toFixed(2)}</td>
                            <td className="py-3 px-3 text-slate-600">{w.method}</td>
                            <td className="py-3 px-3">
                              <StatusBadge status={w.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. USERS TAB */}
          {currentTab === 'users' && (!loading || users.length > 0) && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">User Management</h3>
                  <p className="text-xs text-slate-500">View and inspect user accounts, earnings, and balances</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white font-bold text-slate-700"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Mobile / Email</th>
                      <th className="py-3 px-4">Points</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Total Earned</th>
                      <th className="py-3 px-4">Total Withdrawn</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(u => (
                        <tr key={u._id || u.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-mono font-bold text-blue-600 text-xs">{(u._id || u.id).toString().slice(-8)}</td>
                          <td className="py-4 px-4 font-bold text-slate-900">{u.name}</td>
                          <td className="py-4 px-4 text-slate-600 text-xs">
                            <div className="font-semibold text-slate-800">{u.phone || u.mobile || 'N/A'}</div>
                            <div className="text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-4 px-4 font-extrabold text-amber-600">{u.points || 0} pts</td>
                          <td className="py-4 px-4 font-extrabold text-emerald-600">₹{(u.balance || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 font-semibold text-slate-700">₹{(u.totalEarned || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 font-semibold text-slate-700">₹{(u.totalWithdrawn || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-slate-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td className="py-4 px-4">
                            <StatusBadge status={u.status || 'Active'} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleViewUser(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              <Eye size={14} /> View User
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10"><StatePanel title="No users match these filters" description="Try a different name, email, or status filter." icon={Users} /></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. WITHDRAWALS TAB */}
          {currentTab === 'withdrawals' && (!loading || withdrawals.length > 0) && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Withdrawal Requests</h3>
                  <p className="text-xs text-slate-500">Review payout requests and approve or reject them</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setWithdrawalTab(tab)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${withdrawalTab === tab ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Request ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method & Account</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredWithdrawals.length > 0 ? (
                      filteredWithdrawals.map(w => (
                        <tr key={w._id || w.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">{(w._id || w.id).toString().slice(-8)}</td>
                          <td className="py-4 px-4 font-bold text-slate-900">{w.userId?.name || w.userName || 'User'}</td>
                          <td className="py-4 px-4 font-black text-slate-900">₹{(w.amount || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-slate-600 text-xs">
                            <div className="font-bold text-slate-800">{w.method}</div>
                            <div className="font-mono text-slate-400">{w.accountMasked || '••••-****-1234'}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-xs">{w.date || new Date(w.createdAt || Date.now()).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <StatusBadge status={w.status} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            {(w.status || '').toLowerCase() === 'pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setConfirmDialog({ isOpen: true, id: w._id || w.id, action: 'approve', userName: w.userId?.name || w.userName || 'User' })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                                >
                                  <CheckCircle size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => setConfirmDialog({ isOpen: true, id: w._id || w.id, action: 'reject', userName: w.userId?.name || w.userName || 'User' })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold italic">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7"><StatePanel title="No requests in this view" description="Change the status filter or check back when requests arrive." icon={Wallet} /></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. TASKS TAB */}
          {currentTab === 'tasks' && (!loading || tasks.length > 0) && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Task Management</h3>
                  <p className="text-xs text-slate-500">Add, edit, or remove reward tasks for app users</p>
                </div>
                <button
                  onClick={() => {
                    setCurrentTask({ id: '', title: '', description: '', youtubeUrl: '', points: 50, status: 'Active' });
                    setIsEditingTask(false);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/25 transition"
                >
                  <Plus size={18} /> Add New Task
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Task ID</th>
                      <th className="py-3 px-4">Task Number</th>
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Admin Points</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {tasks.length > 0 ? (
                      [...tasks].sort((left, right) => {
                        const leftNumber = Number.isInteger(left.taskNumber) && left.taskNumber >= 1 && left.taskNumber <= 50
                          ? left.taskNumber : Number.MAX_SAFE_INTEGER;
                        const rightNumber = Number.isInteger(right.taskNumber) && right.taskNumber >= 1 && right.taskNumber <= 50
                          ? right.taskNumber : Number.MAX_SAFE_INTEGER;
                        return leftNumber - rightNumber || String(left.title || '').localeCompare(String(right.title || ''));
                      }).map(t => (
                        <tr key={t._id || t.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">{(t._id || t.id).toString().slice(-8)}</td>
                          <td className="py-4 px-4">
                            {Number.isInteger(t.taskNumber) && t.taskNumber >= 1 && t.taskNumber <= 50 ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">#{t.taskNumber}</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Legacy</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900">{t.title || t.name}</td>
                          <td className="py-4 px-4 text-slate-600 max-w-xs truncate text-xs">{t.description}</td>
                          <td className="py-4 px-4 font-extrabold text-amber-600">{t.points ?? 0} pts</td>
                          <td className="py-4 px-4">
                            <StatusBadge status={t.status || (t.completed ? 'Completed' : 'Active')} />
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setCurrentTask({
                                    ...t,
                                    title: t.title || t.name,
                                    description: t.description || '',
                                    youtubeUrl: t.youtubeUrl || ''
                                  });
                                  setIsEditingTask(true);
                                  setIsTaskModalOpen(true);
                                }}
                                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-xs"
                                title="Edit Task"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t._id || t.id)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-xs"
                                title="Delete Task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8"><StatePanel title="No reward tasks yet" description="Create a task to make it available to app users." icon={CheckSquare} /></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. TRANSACTIONS TAB */}
          {currentTab === 'transactions' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Platform Transactions</h3>
                <p className="text-xs text-slate-500">Detailed credit and debit history across all users</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">TXN ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Points</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {transactions.length > 0 ? transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">{tx.id}</td>
                        <td className="py-4 px-4 font-bold text-slate-900">{tx.userName}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            tx.type === 'Credit' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.type === 'Credit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900">{tx.amount}</td>
                        <td className="py-4 px-4 font-bold text-amber-600">{tx.points}</td>
                        <td className="py-4 px-4 text-slate-500 text-xs">{tx.date}</td>
                        <td className="py-4 px-4">
                          <StatusBadge status={tx.status} />
                        </td>
                      </tr>
                    )) : <tr><td colSpan="7"><StatePanel title="No transactions to show" description="Transaction activity will appear here when available." icon={ArrowLeftRight} /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. BANK DETAILS TAB */}
          {currentTab === 'bank-details' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 md:p-8 max-w-4xl">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Registered Bank & UPI Information</h3>
              <p className="text-xs text-slate-500 mb-6">Sensitive user banking records with masked account numbers for privacy and regulatory compliance.</p>

              <div className="space-y-4">
                {users.length > 0 ? users.map(u => (
                  <div key={u._id || u.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{u.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                        <div><span className="text-slate-400 font-medium">Bank:</span> {u.bankDetails?.bankName || 'HDFC Bank'}</div>
                        <div><span className="text-slate-400 font-medium">A/C:</span> <span className="font-mono text-slate-900">{maskAccountNumber(u.bankDetails?.accountNumber || '4821')}</span></div>
                        <div><span className="text-slate-400 font-medium">IFSC:</span> <span className="font-mono">{u.bankDetails?.ifsc || 'HDFC0001234'}</span></div>
                        <div><span className="text-slate-400 font-medium">UPI:</span> <span className="font-mono">{u.bankDetails?.upiId || 'taskbit@okhdfcbank'}</span></div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-xl self-start sm:self-center shadow-xs">
                      Secure Masked
                    </span>
                  </div>
                )) : <StatePanel title="No user records available" description="Users with payout information will appear here." icon={CreditCard} />}
              </div>
            </div>
          )}

          {/* 7. SETTINGS TAB */}
          {currentTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 md:p-8 max-w-3xl">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Admin Account Settings</h3>
              <p className="text-xs text-slate-500 mb-6">Manage your admin profile preferences and security password.</p>

              <div className="space-y-6">
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Profile Information</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Display Name</label>
                    <input
                      type="text"
                      value={adminProfile.name}
                      onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      value={adminProfile.email}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <button
                    onClick={() => showToast('Admin profile updated successfully!', 'success')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Change Password</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!passwordForm.current || passwordForm.newPass.length < 12 || passwordForm.newPass !== passwordForm.confirm) {
                        setPasswordMsg('Enter your current password and matching new passwords of at least 12 characters.');
                        return;
                      }
                      try {
                        const res = await adminFetch('auth/change-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Could not change password.');
                        setPasswordMsg(data.message);
                        setPasswordForm({ current: '', newPass: '', confirm: '' });
                        setIsLoggedIn(false);
                      } catch (err) {
                        setPasswordMsg(err.message);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Update Password
                  </button>
                  {passwordMsg && <p className="text-xs text-red-600 font-bold">{passwordMsg}</p>}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedUser.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {(selectedUser._id || selectedUser.id)} | Joined: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setSelectedUserBank(null); }}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Financial Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-blue-600 font-extrabold uppercase tracking-wider">Points</p>
                  <p className="text-xl font-black text-blue-950 mt-1">{selectedUser.points || 0}</p>
                </div>
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[11px] text-emerald-600 font-extrabold uppercase tracking-wider">Balance</p>
                  <p className="text-xl font-black text-emerald-950 mt-1">₹{(selectedUser.balance || 0).toFixed(2)}</p>
                </div>
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[11px] text-amber-600 font-extrabold uppercase tracking-wider">Earned</p>
                  <p className="text-xl font-black text-amber-950 mt-1">₹{(selectedUser.totalEarned || 0).toFixed(2)}</p>
                </div>
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100">
                  <p className="text-[11px] text-purple-600 font-extrabold uppercase tracking-wider">Withdrawn</p>
                  <p className="text-xl font-black text-purple-950 mt-1">₹{(selectedUser.totalWithdrawn || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Bank Details Section (Masked account number) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-600" /> Bank & UPI Details (Masked Secure)
                </h4>
                {bankLoading ? (
                  <p className="text-xs text-slate-500 py-2 animate-pulse">Loading secure bank details...</p>
                ) : selectedUserBank ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Account Holder</span>
                      <span className="font-bold text-slate-800">{selectedUserBank.accountHolderName || selectedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Bank Name</span>
                      <span className="font-bold text-slate-800">{selectedUserBank.bankName || 'HDFC Bank'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Account Number</span>
                      <span className="font-mono font-bold text-slate-900">{maskAccountNumber(selectedUserBank.accountNumber)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900">{selectedUserBank.ifsc || 'HDFC0001234'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-400 block font-medium">UPI ID</span>
                      <span className="font-mono font-bold text-slate-900">{selectedUserBank.upiId || 'taskbit@okhdfcbank'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No bank or UPI details linked for this user.</p>
                )}
              </div>

              {/* Transactions History */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Transaction History</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Points</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {(selectedUser.transactions || []).length > 0 ? (
                        selectedUser.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-700">{tx.type || 'Credit'}</td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">{tx.amount || '₹50.00'}</td>
                            <td className="py-2.5 px-3 font-bold text-amber-600">{tx.points || '+100 Pts'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{tx.date || '2026-03-30'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-slate-400 italic">No recent transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-8 text-right">
              <button
                onClick={() => { setSelectedUser(null); setSelectedUserBank(null); }}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition shadow-md"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR WITHDRAWAL APPROVAL/REJECTION */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
              confirmDialog.action === 'approve' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20' : 'bg-red-100 text-red-600 shadow-red-500/20'
            }`}>
              {confirmDialog.action === 'approve' ? <CheckCircle size={30} /> : <XCircle size={30} />}
            </div>
            <h3 className="text-lg font-black text-slate-900 capitalize">{confirmDialog.action} Payout Request?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Are you sure you want to {confirmDialog.action} the withdrawal request for <span className="font-bold text-slate-800">{confirmDialog.userName}</span>?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, id: null, action: null, userName: '' })}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={executeWithdrawalAction}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition ${
                  confirmDialog.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                }`}
              >
                Confirm {confirmDialog.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <h3 className="text-lg font-black text-slate-900">{isEditingTask ? 'Edit Reward Task' : 'Create New Reward Task'}</h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-gray-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Task Title</label>
                <input
                  type="text"
                  value={currentTask.title}
                  onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                  required
                  placeholder="e.g. Watch YouTube Video"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-slate-50/50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={currentTask.description}
                  onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                  rows="3"
                  placeholder="Task instructions..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-slate-50/50 font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Video URL</label>
                <input
                  type="url"
                  value={currentTask.youtubeUrl || ''}
                  onChange={(e) => setCurrentTask({ ...currentTask, youtubeUrl: e.target.value })}
                  required={currentTask.status === 'Active'}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-slate-50/50 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Admin Task Points</label>
                  <input
                    type="number"
                    value={currentTask.points}
                    onChange={(e) => setCurrentTask({ ...currentTask, points: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-slate-50/50 font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">User completion reward is fixed at 0.5 coin and does not use this field.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={currentTask.status}
                    onChange={(e) => setCurrentTask({ ...currentTask, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                >
                  {isEditingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
