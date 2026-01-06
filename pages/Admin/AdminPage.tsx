
import React, { useEffect, useState } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { Loader2, Users, Save, X, Edit2, ShieldAlert, Ban, Trash2, History, AlertTriangle, Zap, BarChart3, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HistoryModal from '../../components/Admin/HistoryModal';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [creditRequests, setCreditRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'stats'>('users');
    const [stats, setStats] = useState<{
        system: { totalGenerations: number, totalUsers: number, generationsLast24h: number, totalCostUSD: number },
        daily: { date: string, count: number, cost: number }[],
        leaderboard: any[]
    } | null>(null);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dailyReport, setDailyReport] = useState<any[] | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuota, setEditQuota] = useState<number>(0);

    // History Modal State
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userHistory, setUserHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!user) return;

            const isAdmin = await adminService.checkIsAdmin(user.id);
            if (!isAdmin) {
                navigate('/');
                return;
            }

            loadData();
        };
        init();
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, requestsData, statsData] = await Promise.all([
                adminService.getVisibleUsers(),
                supabase.from('credit_requests').select('*, profiles(full_name)').order('created_at', { ascending: false }),
                adminService.getSystemStats().then(async (system) => ({
                    system,
                    daily: await adminService.getDailyStats(),
                    leaderboard: await adminService.getUserLeaderboard()
                }))
            ]);
            setUsers(usersData);
            setCreditRequests(requestsData.data || []);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRequest = async (requestId: string, userId: string, amount: number, action: 'approve' | 'declined') => {
        try {
            setProcessingId(requestId);
            if (action === 'approve') {
                const user = users.find(u => u.id === userId);
                const currentQuota = user?.generation_quota || 0;
                await adminService.updateUserQuota(userId, currentQuota + amount);
            }

            const { error } = await supabase.from('credit_requests').update({ status: action }).eq('id', requestId);
            if (error) throw error;

            // Update local state
            setCreditRequests(creditRequests.map(r => r.id === requestId ? { ...r, status: action } : r));
            if (action === 'approve') {
                setUsers(users.map(u => u.id === userId ? { ...u, generation_quota: (u.generation_quota || 0) + amount } : u));
            }
        } catch (error) {
            console.error(error);
            alert('Failed to process request: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const startEditing = (u: AdminUser) => {
        setEditingId(u.id);
        setEditQuota(u.generation_quota || 20);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditQuota(0);
    };

    const saveQuota = async (userId: string) => {
        try {
            await adminService.updateUserQuota(userId, editQuota);
            setUsers(users.map(u => u.id === userId ? { ...u, generation_quota: editQuota } : u));
            setEditingId(null);
        } catch (error) {
            alert("Failed to update quota");
        }
    };

    const handleBanUser = async (u: AdminUser) => {
        if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY BAN ${u.full_name || u.id}? \n\nThis will:\n1. Delete all their generation history and data\n2. Delete their account\n3. Blacklist their email forever`)) return;

        try {
            await adminService.banUser(u.id);
            setUsers(users.filter(user => user.id !== u.id));
            alert("User has been permanently banned and their data wiped.");
        } catch (error) {
            alert(`Failed to ban user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const deleteUser = async (u: AdminUser) => {
        if (!confirm(`DANGER: Are you sure you want to delete ${u.full_name || u.id}? \n\nThis will permanently remove their profile, history, and authentication record. This action cannot be undone.`)) return;

        try {
            await adminService.deleteUser(u.id);
            setUsers(users.filter(user => user.id !== u.id));
            alert("User deleted successfully.");
        } catch (error) {
            alert("Failed to delete user: " + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const viewHistory = async (u: AdminUser) => {
        try {
            setSelectedUser(u);
            setLoadingHistory(true);
            const history = await adminService.getUserHistory(u.id);
            setUserHistory(history || []);
        } catch (error) {
            console.error("Failed to load user history", error);
            alert("Failed to load user history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setLoadingReport(true);
            const report = await adminService.getDailyReport(reportDate);
            setDailyReport(report);
        } catch (error) {
            alert("Failed to generate report");
        } finally {
            setLoadingReport(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="animate-spin mr-2" /> Loading Admin Panel...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-900/20 rounded-xl border border-indigo-500/30">
                            <ShieldAlert className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Control</h1>
                            <p className="text-slate-400 text-sm font-medium">Global system management and auditing</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Users size={16} /> Users
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Zap size={16} /> Requests {creditRequests.filter(r => r.status === 'pending').length > 0 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <BarChart3 size={16} /> Stats
                        </button>
                    </div>
                </header>

                {activeTab === 'users' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-5">User Identity</th>
                                        <th className="px-6 py-5 text-center">Standing</th>
                                        <th className="px-6 py-5 text-center">Usage</th>
                                        <th className="px-6 py-5 text-center">Quota</th>
                                        <th className="px-6 py-5 text-right pr-12">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No users found.</td>
                                        </tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u.id} className={`hover:bg-slate-800/30 transition-colors ${u.is_banned ? 'bg-red-900/5' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                                            <Users size={20} className="text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white leading-tight">{u.full_name || 'Anonymous User'}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{u.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {u.is_banned ? (
                                                        <span className="px-2 py-1 rounded bg-red-900/30 text-red-500 text-[10px] font-black uppercase border border-red-500/20">Banned</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-slate-300">{u.generations_used}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {editingId === u.id ? (
                                                        <input
                                                            type="number"
                                                            value={editQuota}
                                                            onChange={(e) => setEditQuota(Number(e.target.value))}
                                                            className="w-20 bg-slate-950 border border-indigo-500 rounded-lg px-2 py-1 text-center font-black outline-none"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-black text-indigo-400">{u.generation_quota}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {editingId === u.id ? (
                                                            <>
                                                                <button onClick={() => saveQuota(u.id)} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"><Save size={16} /></button>
                                                                <button onClick={cancelEditing} className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"><X size={16} /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => viewHistory(u)} className="p-2 text-slate-400 hover:text-white" title="History"><History size={18} /></button>
                                                                <button onClick={() => startEditing(u)} className="p-2 text-slate-400 hover:text-white" title="Quota"><Edit2 size={18} /></button>
                                                                <button onClick={() => handleBanUser(u)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Permanent Ban"><Ban size={18} /></button>
                                                                <button onClick={() => deleteUser(u)} className="p-2 text-slate-600 hover:text-red-500" title="Delete"><Trash2 size={18} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'requests' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-5">User</th>
                                        <th className="px-6 py-5 text-center">Amount Requested</th>
                                        <th className="px-6 py-5 text-center">Status</th>
                                        <th className="px-6 py-5 text-center">Requested At</th>
                                        <th className="px-6 py-5 text-right pr-12">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {creditRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No credit requests found.</td>
                                        </tr>
                                    ) : (
                                        creditRequests.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-white">{r.profiles?.full_name || 'Unknown User'}</td>
                                                <td className="px-6 py-4 text-center font-black text-indigo-400 text-lg">+{r.amount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${r.status === 'pending' ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/20' :
                                                        r.status === 'approved' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' :
                                                            'bg-red-900/20 text-red-500 border-red-500/20'
                                                        }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-500 text-xs">
                                                    {new Date(r.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {r.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleProcessRequest(r.id, r.user_id, r.amount, 'approve')}
                                                                    disabled={processingId === r.id}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                    {processingId === r.id ? <Loader2 size={12} className="animate-spin" /> : 'APPROVE'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleProcessRequest(r.id, r.user_id, r.amount, 'declined')}
                                                                    disabled={processingId === r.id}
                                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-white rounded-lg text-xs font-black transition-colors disabled:opacity-50"
                                                                >
                                                                    {processingId === r.id ? '...' : 'DECLINE'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        {/* KPI Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-2 bg-indigo-900/20 rounded-lg text-indigo-400">
                                        <Zap size={20} />
                                    </div>
                                    <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Generations</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats?.system.totalGenerations.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Users</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats?.system.totalUsers.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-2 bg-amber-900/20 rounded-lg text-amber-400">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Est. Total Cost (USD)</span>
                                </div>
                                <div className="text-3xl font-black text-white">${stats?.system.totalCostUSD.toFixed(2)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Daily Usage */}
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-indigo-400" size={18} />
                                        <h3 className="font-bold text-white uppercase tracking-tight">Daily Activity & Cost</h3>
                                    </div>
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="space-y-2">
                                        {stats?.daily.slice(0, 10).map((day) => (
                                            <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-slate-400">{day.date}</span>
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase mt-0.5">${day.cost.toFixed(3)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${Math.min(day.count * 2, 120)}px` }}></div>
                                                    <span className="font-black text-white text-sm">{day.count} gens</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Trophy className="text-yellow-400" size={18} />
                                        <h3 className="font-bold text-white uppercase tracking-tight">Top Active Users</h3>
                                    </div>
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="space-y-2">
                                        {stats?.leaderboard.map((u, i) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-bold text-white text-sm truncate max-w-[150px]">{u.full_name || 'Anonymous'}</span>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Generations</div>
                                                        <div className="font-black text-indigo-400">{u.generations_used}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const userObj = users.find(user => user.id === u.id);
                                                            if (userObj) viewHistory(userObj);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-white transition-colors"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Report Generator */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl mt-6">
                            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BarChart3 className="text-indigo-400" size={18} />
                                    <h3 className="font-bold text-white uppercase tracking-tight">Daily Usage Report</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="date"
                                        value={reportDate}
                                        onChange={(e) => setReportDate(e.target.value)}
                                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={loadingReport}
                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loadingReport ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        GENERATE
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                {!dailyReport ? (
                                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                        Select a date and click generate to view detailed usage logs
                                    </div>
                                ) : dailyReport.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-bold">
                                        No generations recorded for {reportDate}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3">Time</th>
                                                    <th className="px-4 py-3">User</th>
                                                    <th className="px-4 py-3">Model</th>
                                                    <th className="px-4 py-3">Style</th>
                                                    <th className="px-4 py-3 text-right">Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {dailyReport.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-slate-800/30">
                                                        <td className="px-4 py-2 text-slate-400 font-mono">
                                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-4 py-2 font-bold text-white">
                                                            {item.profiles?.full_name || 'Anonymous'}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
                                                                {item.model_name || 'unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 italic text-slate-500">{item.style}</td>
                                                        <td className="px-4 py-2 text-right font-black text-emerald-500">
                                                            ${Number(item.estimated_cost).toFixed(3)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-950/50 font-black text-white">
                                                    <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-widest text-[10px]">Total Daily Cost:</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400 text-sm">
                                                        ${dailyReport.reduce((sum: number, i: any) => sum + (Number(i.estimated_cost) || 0), 0).toFixed(3)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex items-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-slate-900/30 p-4 rounded-lg border border-slate-800/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                        <span>Active User</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <span>Banned / Restricted</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span>Delete/Ban PERMANENTLY removes Auth, Profile and History</span>
                    </div>
                </div>
            </div>

            <HistoryModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={{ id: selectedUser?.id || '', full_name: selectedUser?.full_name || null }}
                history={userHistory}
            />

            {loadingHistory && (
                <div className="fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                </div>
            )}
        </div>
    );
};

export default AdminPage;
