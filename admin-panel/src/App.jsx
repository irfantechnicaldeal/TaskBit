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
  UserCheck,
  UserX,
  Sparkles,
  Shield,
  Layers,
  PieChart,
  Zap,
  Target
} from 'lucide-react';
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
  // Auth state is verified by the backend session cookie.
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

  // App data state (backend is the only source of truth)
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [archivedWithdrawals, setArchivedWithdrawals] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserBank, setSelectedUserBank] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(null);

  // Withdrawal full-details modal state (bank/UPI record linked to the same user)
  const [detailsWithdrawal, setDetailsWithdrawal] = useState(null);
  const [detailsBank, setDetailsBank] = useState(null);
  const [detailsBankLoading, setDetailsBankLoading] = useState(false);

  // Task modal state (Add / Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState({ id: '', title: '', description: '', youtubeUrl: '', coinReward: 0.5, status: 'Active' });
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Withdrawal confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, action: null, userName: '' });

  // Users filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Withdrawals tab state
  const [withdrawalTab, setWithdrawalTab] = useState('All');

  // Settings state
  const [adminProfile, setAdminProfile] = useState({ name: 'Administrator', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  // Show Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch all data from backend API
  const fetchBackendData = async () => {
    setLoading(true);
    setBackendError(null);
    try {
      const [usersRes, withdrawalsRes, tasksRes] = await Promise.all([
        adminFetch('users'),
        adminFetch('withdrawals?includeArchived=true'),
        adminFetch('tasks')
      ]);

      if (!usersRes.ok || !withdrawalsRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch data from backend API');
      }

      const usersData = await usersRes.json();
      const withdrawalsData = await withdrawalsRes.json();
      const tasksData = await tasksRes.json();

      // Archived (soft-deleted) rows are kept separate so the default views
      // stay unchanged; they are only shown in the Archived tab.
      const allWithdrawals = Array.isArray(withdrawalsData) ? withdrawalsData : [];
      setUsers(usersData);
      setWithdrawals(allWithdrawals.filter(w => !w.archived));
      setArchivedWithdrawals(allWithdrawals.filter(w => w.archived));
      setTasks(tasksData);
      setBackendError(null);
    } catch (err) {
      console.warn('Backend unavailable:', err);
      setBackendError('Could not load admin data from the backend. Check the connection and retry.');
      setUsers([]);
      setWithdrawals([]);
      setArchivedWithdrawals([]);
      setTasks([]);
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
    setBankError(null);
    setBankLoading(true);

    const userId = user._id || user.id;
    try {
      const res = await adminFetch(`bank-details/${userId}`);
      if (res.ok) {
        const bankData = await res.json();
        setSelectedUserBank(bankData);
      } else if (res.status === 404) {
        setSelectedUserBank(null);
      } else {
        throw new Error('Could not load saved bank details.');
      }
    } catch (err) {
      console.warn('Could not fetch bank details from backend:', err);
      setSelectedUserBank(null);
      setBankError(err.message || 'Could not load saved bank details.');
    } finally {
      setBankLoading(false);
    }
  };

  // Open the full details for a withdrawal request (admin only). Payout details
  // come from the same user's linked bank record via the admin-authenticated
  // endpoint; missing values are shown as "Not provided", never guessed.
  const handleViewWithdrawalDetails = async (withdrawal) => {
    const userId = withdrawal.userId?._id || withdrawal.userId?.id || withdrawal.userId;
    setDetailsWithdrawal(withdrawal);
    setDetailsBank(null);
    setDetailsBankLoading(true);
    try {
      const res = await adminFetch(`bank-details/${userId}`);
      if (res.ok) {
        setDetailsBank(await res.json());
      } else if (res.status === 404) {
        setDetailsBank(null);
      } else {
        throw new Error('Could not load payout details.');
      }
    } catch (err) {
      console.warn('Could not fetch payout details from backend:', err);
      setDetailsBank(null);
    } finally {
      setDetailsBankLoading(false);
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

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'The backend rejected this status update.');
      }
      setWithdrawals(prev => prev.map(w => (w._id === id || w.id === id) ? { ...w, status: newStatus.toLowerCase() } : w));
      showToast(`Withdrawal request ${newStatus.toLowerCase()} successfully.`, 'success');
    } catch (err) {
      console.warn('Failed to update withdrawal status on backend:', err);
      showToast(`Could not update withdrawal request: ${err.message || 'Check the backend connection and try again.'}`, 'error');
    } finally {
      setConfirmDialog({ isOpen: false, id: null, action: null, userName: '' });
    }
  };

  // Handle Task Save (Add / Edit)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const taskId = currentTask._id || currentTask.id;
    const coinRewardInput = currentTask.coinReward;
    const coinReward = Number(coinRewardInput);
    if (coinRewardInput === '' || coinRewardInput === null || coinRewardInput === undefined ||
        !Number.isFinite(coinReward) || coinReward < 0 || coinReward > 1000 ||
        Math.abs(coinReward * 2 - Math.round(coinReward * 2)) > 1e-9) {
      showToast('Coin reward must be between 0 and 1000 coins in 0.5 increments.', 'error');
      return;
    }
    const taskPayload = {
      title: currentTask.title || currentTask.name,
      description: currentTask.description?.trim() || '',
      youtubeUrl: currentTask.youtubeUrl?.trim() || '',
      coinReward,
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
      setCurrentTask({ id: '', title: '', description: '', youtubeUrl: '', coinReward: 0.5, status: 'Active' });
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

  // Handle User Delete (permanently removes the account, coin balance, wallet,
  // and user-specific data). The backend refuses deletion when the user has paid
  // (approved) withdrawal history so financial records are never lost.
  const handleDeleteUser = async (user) => {
    const id = user._id || user.id;
    const maskedId = id ? id.toString().slice(-8) : 'N/A';
    const contact = user.email || user.phone || user.mobile || 'No email/phone on file';
    const confirmed = window.confirm(
      `Permanently delete this user?\n\n` +
      `Name: ${user.name || 'User'}\n` +
      `Contact: ${contact}\n` +
      `User ID: …${maskedId}\n` +
      `Balance: ₹${(user.balance || 0).toFixed(2)}  •  Points: ${user.points || 0}\n\n` +
      'This removes the account, coin balance, wallet, bank details, and this user\'s task history.\n' +
      'Users with paid withdrawal history cannot be deleted.'
    );
    if (!confirmed) return;
    try {
      const response = await adminFetch(`users/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'User deletion rejected by backend');
      }
      setUsers(prev => prev.filter(u => (u._id || u.id) !== id));
      showToast('User deleted successfully.', 'info');
    } catch (err) {
      console.warn('Failed to delete user on backend:', err);
      showToast(err.message || 'User was not deleted. Check the backend connection and try again.', 'error');
    }
  };

  // Handle Withdrawal Archive (soft-delete). Nothing is removed from the
  // database. The backend refuses to archive approved (paid) records because
  // they are permanent financial audit records (retention policy).
  const handleArchiveWithdrawal = async (withdrawal) => {
    const id = withdrawal._id || withdrawal.id;
    const userName = withdrawal.userId?.name || withdrawal.userName || 'User';
    const confirmed = window.confirm(
      `Archive this withdrawal request?\n\n` +
      `User: ${userName}\n` +
      `Amount: ₹${(withdrawal.amount || 0).toFixed(2)}  •  Method: ${withdrawal.method || 'N/A'}\n\n` +
      'Archived requests are hidden from the default list but are NOT deleted — restore them anytime from the Archived tab.\n' +
      'Approved (paid) records are financial audit records and cannot be archived or deleted.'
    );
    if (!confirmed) return;
    try {
      const res = await adminFetch(`withdrawals/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'Archive rejected by backend');
      }
      setWithdrawals(prev => prev.filter(w => (w._id || w.id) !== id));
      setArchivedWithdrawals(prev => [{ ...withdrawal, archived: true, archivedAt: new Date().toISOString() }, ...prev]);
      showToast('Withdrawal request archived. Restore it anytime from the Archived tab.', 'info');
    } catch (err) {
      console.warn('Failed to archive withdrawal on backend:', err);
      showToast(err.message || 'Could not archive withdrawal request. Check the backend connection and try again.', 'error');
    }
  };

  // Handle Withdrawal Restore (un-archive)
  const handleRestoreWithdrawal = async (withdrawal) => {
    const id = withdrawal._id || withdrawal.id;
    try {
      const res = await adminFetch(`withdrawals/${id}/restore`, { method: 'PUT' });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || 'Restore rejected by backend');
      }
      setArchivedWithdrawals(prev => prev.filter(w => (w._id || w.id) !== id));
      setWithdrawals(prev => [{ ...withdrawal, archived: false, archivedAt: null }, ...prev]);
      showToast('Withdrawal request restored.', 'success');
    } catch (err) {
      console.warn('Failed to restore withdrawal on backend:', err);
      showToast(err.message || 'Could not restore withdrawal request. Check the backend connection and try again.', 'error');
    }
  };

  // Helper to mask account number securely
  const maskAccountNumber = (accNum) => {
    if (!accNum || accNum === 'N/A') return 'Not provided';
    const clean = accNum.toString();
    if (clean.length <= 4) return '••••-' + clean;
    return '••••-****-' + clean.slice(-4);
  };

  // Computed Metrics
  const totalUsers = users.length;
  const totalPoints = users.reduce((acc, u) => acc + (u.points || 0), 0);
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalEarnings = users.reduce((acc, u) => acc + (u.totalEarned || 0), 0);
  const activeTasksCount = tasks.filter(t => (t.status || 'Active') === 'Active').length;

  const pendingWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'pending').length;
  const approvedWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'approved').length;
  const rejectedWithdrawalsCount = withdrawals.filter(w => (w.status || '').toLowerCase() === 'rejected').length;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    const s = (w.status || '').toLowerCase();
    if (withdrawalTab === 'Pending') return s === 'pending';
    if (withdrawalTab === 'Approved') return s === 'approved';
    if (withdrawalTab === 'Rejected') return s === 'rejected';
    return true;
  });

  // Archived (soft-deleted) requests are shown in their own tab, restore-only.
  const isArchivedView = withdrawalTab === 'Archived';
  const visibleWithdrawals = isArchivedView ? archivedWithdrawals : filteredWithdrawals;

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

                <StatCard label="Total users" value={totalUsers.toLocaleString()} note="Registered accounts" icon={Users} tone="blue" />

                <StatCard label="Points in circulation" value={totalPoints.toLocaleString()} note="Current user point balances" icon={Award} tone="cyan" />

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between hover:shadow-md transition group">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Balance</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">₹{totalBalance.toFixed(2)}</h3>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <DollarSign size={14} /> Current user balances
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
                      <TrendingUp size={14} /> Total user earnings
                    </span>
                  </div>
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                    <TrendingUp size={26} />
                  </div>
                </div>

              </div>

              {/* Secondary Metric Cards (Tasks & Withdrawals Status Breakdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Reward Tasks</p>
                    <h4 className="text-2xl font-black text-blue-600 mt-1">{tasks.length}</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">{activeTasksCount} active</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <CheckSquare size={22} />
                  </div>
                </div>

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
                              <StatusBadge status={u.status || 'Not tracked'} />
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
                            <StatusBadge status={u.status || 'Not tracked'} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewUser(u)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition shadow-xs"
                              >
                                <Eye size={14} /> View User
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-xs"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
          {currentTab === 'withdrawals' && (!loading || withdrawals.length > 0 || archivedWithdrawals.length > 0) && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{withdrawalTab === 'Archived' ? 'Archived Withdrawal Requests' : 'Withdrawal Requests'}</h3>
                  <p className="text-xs text-slate-500">{withdrawalTab === 'Archived' ? 'Archived requests are hidden from active views and can be restored' : 'Review payout requests and approve or reject them'}</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['All', 'Pending', 'Approved', 'Rejected', 'Archived'].map(tab => (
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
                    {visibleWithdrawals.length > 0 ? (
                      visibleWithdrawals.map(w => (
                        <tr key={w._id || w.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">{(w._id || w.id).toString().slice(-8)}</td>
                          <td className="py-4 px-4 font-bold text-slate-900">{w.userId?.name || w.userName || 'User'}</td>
                          <td className="py-4 px-4 font-black text-slate-900">₹{(w.amount || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-slate-600 text-xs">
                            <div className="font-bold text-slate-800">{w.method}</div>
                            <div className="font-mono text-slate-400">{w.accountMasked || '••••-****-1234'}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-500 text-xs">{w.date || (w.createdAt ? new Date(w.createdAt).toLocaleString() : '—')}</td>
                          <td className="py-4 px-4">
                            <StatusBadge status={isArchivedView ? 'Archived' : w.status} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleViewWithdrawalDetails(w)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition shadow-xs"
                                title="View full withdrawal details"
                              >
                                <Eye size={14} /> View Full Details
                              </button>
                              {isArchivedView ? (
                                <button
                                  onClick={() => handleRestoreWithdrawal(w)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition shadow-xs"
                                  title="Restore withdrawal request"
                                >
                                  <RefreshCw size={14} /> Restore
                                </button>
                              ) : (w.status || '').toLowerCase() === 'pending' ? (
                                <>
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
                                  <button
                                    onClick={() => handleArchiveWithdrawal(w)}
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-xs"
                                    title="Archive withdrawal request"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (w.status || '').toLowerCase() === 'approved' ? (
                                <span
                                  className="p-2 bg-slate-100 text-slate-400 rounded-xl"
                                  title="Approved (paid) records are financial audit records and cannot be deleted (retention policy)."
                                >
                                  <Lock size={16} />
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleArchiveWithdrawal(w)}
                                  className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-xs"
                                  title="Archive withdrawal request"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7"><StatePanel title={isArchivedView ? 'No archived requests' : 'No requests in this view'} description={isArchivedView ? 'Withdrawal requests you archive will appear here and can be restored.' : 'Change the status filter or check back when requests arrive.'} icon={Wallet} /></td>
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
                    setCurrentTask({ id: '', title: '', description: '', youtubeUrl: '', coinReward: 0.5, status: 'Active' });
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
                      <th className="py-3 px-4">Coin Reward</th>
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
                          <td className="py-4 px-4 font-extrabold text-emerald-600">{Number.isFinite(t.coinReward) ? `${t.coinReward} coins` : '0.5 coins'}</td>
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
                                    youtubeUrl: t.youtubeUrl || '',
                                    coinReward: typeof t.coinReward === 'number' ? t.coinReward : 0.5
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
                    <tr><td colSpan="7"><StatePanel title="No transactions to show" description="Transaction history is not currently provided by the backend." icon={ArrowLeftRight} /></td></tr>
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
                      <p className="mt-3 text-xs text-slate-500">Open user details to load saved payout information.</p>
                    </div>
                    <button onClick={() => handleViewUser(u)} className="px-3 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl self-start sm:self-center hover:bg-blue-100">
                      View secure details
                    </button>
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
                  <h4 className="text-sm font-bold text-slate-900">Admin account</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      value={adminProfile.email}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Profile editing is not available. This email comes from the authenticated admin session.</p>
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

              {/* Payout Details Section: UPI and Bank shown separately */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-600" /> Payout Details (UPI & Bank)
                </h4>
                {bankLoading ? (
                  <p className="text-xs text-slate-500 py-2 animate-pulse">Loading secure payout details...</p>
                ) : selectedUserBank ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">UPI</p>
                      <div className="text-sm">
                        <span className="text-xs text-slate-400 block font-medium">UPI ID</span>
                        <span className="font-mono font-bold text-slate-900">{selectedUserBank.upiId || 'Not provided'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Bank (masked for security)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Account Holder</span>
                          <span className="font-bold text-slate-800">{selectedUserBank.accountHolderName || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Bank Name</span>
                          <span className="font-bold text-slate-800">{selectedUserBank.bankName || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Account Number</span>
                          <span className="font-mono font-bold text-slate-900">{maskAccountNumber(selectedUserBank.accountNumber)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">IFSC Code</span>
                          <span className="font-mono font-bold text-slate-900">{selectedUserBank.ifsc || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Branch</span>
                          <span className="font-bold text-slate-800">Not provided</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : bankError ? (
                  <p className="text-xs text-red-600 py-2">{bankError}</p>
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
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-400 italic">Transaction history is not currently provided by the backend.</td>
                      </tr>
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

      {/* WITHDRAWAL DETAILS MODAL */}
      {detailsWithdrawal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="text-lg font-black text-slate-900">Withdrawal Request Details</h3>
              <button
                type="button"
                onClick={() => { setDetailsWithdrawal(null); setDetailsBank(null); }}
                aria-label="Close dialog"
                className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-gray-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
              {/* Request Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Status</p>
                  <div className="mt-1"><StatusBadge status={detailsWithdrawal.status} /></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Payment Method</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{detailsWithdrawal.method || 'Not provided'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Requested On</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{detailsWithdrawal.createdAt ? new Date(detailsWithdrawal.createdAt).toLocaleString() : 'Not provided'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Request ID</p>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-1 break-all">{detailsWithdrawal._id || detailsWithdrawal.id || 'Not provided'}</p>
                </div>
              </div>

              {/* User Information */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3">User Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Name</span>
                    <span className="font-bold text-slate-800">{detailsWithdrawal.userId?.name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">User ID</span>
                    <span className="font-mono font-bold text-slate-800 break-all">{(detailsWithdrawal.userId?._id || detailsWithdrawal.userId || 'Not provided').toString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Email</span>
                    <span className="font-semibold text-slate-800">{detailsWithdrawal.userId?.email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Phone</span>
                    <span className="font-semibold text-slate-800">{detailsWithdrawal.userId?.phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Calculation (all values from the backend response) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Payment Calculation</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">User's Coins (Current Balance)</span>
                    <span className="font-extrabold text-amber-600">{detailsWithdrawal.userId?.points ?? 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Coins Requested</span>
                    <span className="font-extrabold text-slate-900">{Number.isFinite(detailsWithdrawal.coinsRequested) ? detailsWithdrawal.coinsRequested.toLocaleString() : 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Amount Payable</span>
                    <span className="font-extrabold text-emerald-600">₹{(detailsWithdrawal.amount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Conversion Rate</span>
                    <span className="font-bold text-slate-800">{detailsWithdrawal.coinsPerRupee ? `${detailsWithdrawal.coinsPerRupee} coins = ₹1` : 'Not provided'}</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">Conversion rate and coin amounts are provided by the backend's actual payout settings; the amount payable is the value recorded when the request was created.</p>
              </div>

              {/* Payout Details (UPI / Bank from the user's linked record) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Payout Details</h4>
                {detailsBankLoading ? (
                  <p className="text-xs text-slate-500 py-2 animate-pulse">Loading payout details...</p>
                ) : detailsBank ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">UPI</p>
                      <div className="text-sm">
                        <span className="text-xs text-slate-400 block font-medium">UPI ID</span>
                        <span className="font-mono font-bold text-slate-900">{detailsBank.upiId || 'Not provided'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Bank</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Account Holder Name</span>
                          <span className="font-bold text-slate-800">{detailsBank.accountHolderName || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Bank Name</span>
                          <span className="font-bold text-slate-800">{detailsBank.bankName || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Account Number</span>
                          <span className="font-mono font-bold text-slate-900">{detailsBank.accountNumber || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">IFSC Code</span>
                          <span className="font-mono font-bold text-slate-900">{detailsBank.ifsc || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Branch</span>
                          <span className="font-bold text-slate-800">{detailsBank.branch || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No payout details are on file for this user.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => { setDetailsWithdrawal(null); setDetailsBank(null); }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header with close button (always visible, does not scroll) */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="text-lg font-black text-slate-900">{isEditingTask ? 'Edit Reward Task' : 'Create New Reward Task'}</h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                aria-label="Close dialog"
                className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-gray-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable content area */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Coin Reward per Completion</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="1000"
                    value={Number.isFinite(currentTask.coinReward) ? currentTask.coinReward : 0.5}
                    onChange={(e) => setCurrentTask({ ...currentTask, coinReward: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm bg-slate-50/50 font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Coins credited to the user's balance when they complete this task (0.5 increments, max 1000).</p>
                </div>
              </div>

              {/* Sticky footer: actions stay reachable while the content scrolls */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
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
