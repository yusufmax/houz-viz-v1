
import React, { useEffect, useState } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { Loader2, Users, Save, X, Edit2, ShieldAlert, Ban, Trash2, History, AlertTriangle, Zap, BarChart3, TrendingUp, Trophy, Calendar, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HistoryModal from '../../components/Admin/HistoryModal';
import { uploadReferenceImage, deleteReferenceImage, ReferenceImage } from '../../services/referenceImageService';
import ImageUpload from '../../components/ImageUpload';
import { historyService } from '../../services/historyService';
import { DateRangePicker } from '../../components/Admin/DateRangePicker';

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
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuota, setEditQuota] = useState<number>(0);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [globalQuota, setGlobalQuota] = useState(() => Number(localStorage.getItem('admin_global_quota')) || 900);

    // Format cost to 22,8 style (1 decimal, comma separator)
    const formatCost = (val: number | undefined | null) => {
        if (val === undefined || val === null) return '0,0';
        return val.toFixed(1).replace('.', ',');
    };

    // History Modal State
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userHistory, setUserHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);


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
    }, [user?.id]);

    useEffect(() => {
        const isValidDate = (d: string) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d);
        if (activeTab === 'stats' && isValidDate(startDate) && isValidDate(endDate)) {
            loadStats();
        }
    }, [startDate, endDate, activeTab]);


    const loadStats = async () => {
        try {
            setLoadingStats(true);
            const system = await adminService.getSystemStats(
                startDate ? `${startDate}T00:00:00Z` : undefined,
                endDate ? `${endDate}T23:59:59Z` : undefined
            );
            const rawDaily = await adminService.getDailyStats(
                startDate ? `${startDate}T00:00:00Z` : undefined,
                endDate ? `${endDate}T23:59:59Z` : undefined
            );
            const leaderboard = await adminService.getUserLeaderboard();

            // Fill gaps in daily stats
            const filledDaily = fillGapDays(
                rawDaily,
                startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate || new Date().toISOString().split('T')[0]
            );

            setStats({ system, daily: filledDaily, leaderboard });
        } catch (error) {
            console.error("Failed to load stats", error);
        } finally {
            setLoadingStats(false);
        }
    };

    /**
     * Fills missing dates in a sequence with zero values
     */
    const fillGapDays = (data: { date: string, count: number, cost: number }[], start: string, end: string) => {
        if (!start || !end) return data;
        const result = [];
        const startDt = new Date(start);
        const endDt = new Date(end);

        // Safety check for invalid dates
        if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return data;

        const current = new Date(startDt);
        const dataMap = new Map(data.map(d => [d.date, d]));

        // Limit loop to prevent potential infinite loops or extreme ranges
        let safetyCounter = 0;
        while (current <= endDt && safetyCounter < 366) {
            safetyCounter++;
            const dateStr = current.toISOString().split('T')[0];
            const existing = dataMap.get(dateStr);

            result.push(existing || {
                date: dateStr,
                count: 0,
                cost: 0
            });

            current.setDate(current.getDate() + 1);
        }

        return result;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, requestsData] = await Promise.all([
                adminService.getVisibleUsers(),
                supabase.from('credit_requests').select('*, profiles(full_name)').order('created_at', { ascending: false })
            ]);
            setUsers(usersData);
            setCreditRequests(requestsData.data || []);
            await loadStats();
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

    const toggleMagnificUser = async (u: AdminUser) => {
        try {
            const newState = !u.magnific_enabled;
            await adminService.toggleMagnific(u.id, newState);
            setUsers(users.map(user => user.id === u.id ? { ...user, magnific_enabled: newState } : user));
        } catch (error) {
            alert("Failed to toggle Magnific access: " + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const viewHistory = async (u: AdminUser) => {
        try {
            setSelectedUser(u);
            setLoadingHistory(true);
            setHistoryPage(1);
            const { data, count } = await adminService.getUserHistory(u.id, 1, 5);
            setUserHistory(data || []);
            setHistoryTotal(count || 0);
        } catch (error) {
            console.error("Failed to load user history", error);
            alert("Failed to load user history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadMoreHistory = async () => {
        if (!selectedUser) return;
        try {
            setLoadingMoreHistory(true);
            const nextPage = historyPage + 1;
            const { data, count } = await adminService.getUserHistory(selectedUser.id, nextPage, 5);

            if (data) {
                setUserHistory(prev => [...prev, ...data]);
                setHistoryPage(nextPage);
                setHistoryTotal(count || 0);
            }
        } catch (error) {
            console.error("Failed to load more history", error);
        } finally {
            setLoadingMoreHistory(false);
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
            <style>
                {`
                    input[type="date"]::-webkit-calendar-picker-indicator {
                        filter: invert(1);
                        cursor: pointer;
                        opacity: 0.6;
                        transition: opacity 0.2s;
                    }
                    input[type="date"]::-webkit-calendar-picker-indicator:hover {
                        opacity: 1;
                    }
                `}
            </style>
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

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold rounded-xl border border-red-900/30 transition-all self-start md:self-auto"
                        title="Exit Admin Panel"
                    >
                        <LogOut size={16} /> Exit
                    </button>
                </header>

                {
                    activeTab === 'users' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-5 w-16 text-center">#</th>
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
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No users found.</td>
                                            </tr>
                                        ) : (
                                            users.map((u, index) => (
                                                <tr key={u.id} className={`hover:bg-slate-800/30 transition-colors ${u.is_banned ? 'bg-red-900/5' : ''}`}>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-500 text-xs">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                                                <Users size={20} className="text-slate-500" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white leading-tight">
                                                                    {u.display_name || u.full_name || 'Anonymous User'}
                                                                    {u.display_name && u.full_name && u.display_name !== u.full_name && (
                                                                        <span className="text-[10px] text-slate-500 font-normal ml-2">({u.full_name})</span>
                                                                    )}
                                                                </div>
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
                                                                    <button onClick={() => toggleMagnificUser(u)} className={`p-2 transition-colors ${u.magnific_enabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400/50'}`} title={`Magnific Upscale: ${u.magnific_enabled ? 'Enabled' : 'Disabled'}`}><Sparkles size={18} /></button>
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
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                        <BarChart3 className="text-indigo-400" size={18} />
                                        Analytics Overview
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">System performance and usage metrics</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                        Filters controlled at Chart level below
                                    </span>
                                    {(startDate || endDate) && (
                                        <button
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                            className="p-2 text-slate-500 hover:text-white transition-colors"
                                            title="Clear Filters"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

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
                                <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent"></div>
                                    <div className="flex items-center gap-4 mb-2 relative z-10">
                                        <div className="p-2 bg-amber-900/40 rounded-lg text-amber-400">
                                            <ShieldAlert size={20} />
                                        </div>
                                        <span className="text-amber-400 font-bold uppercase tracking-widest text-sm">Total Expenses (USD)</span>
                                    </div>
                                    <div className="text-4xl font-black text-amber-400 relative z-10 drop-shadow-lg">${formatCost(stats?.system.totalCostUSD)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase mt-0.5">${formatCost(day.cost)}</span>
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
                                                        <span className="font-bold text-white text-sm truncate max-w-[150px]">{u.display_name || u.full_name || 'Anonymous'}</span>
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

                                {/* High Volume Usage */}
                                <div className="bg-slate-900 rounded-2xl border border-indigo-900/50 overflow-hidden shadow-2xl flex flex-col relative bg-gradient-to-br from-indigo-950/20 to-transparent">
                                    <div className="p-6 border-b border-indigo-900/50 bg-indigo-950/30 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="text-indigo-500" size={18} />
                                            <h3 className="font-bold text-indigo-400 uppercase tracking-tight">High Volume Users</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Threshold</span>
                                            <input 
                                                type="number" 
                                                value={globalQuota} 
                                                onChange={(e) => {
                                                    const v = Number(e.target.value);
                                                    setGlobalQuota(v);
                                                    localStorage.setItem('admin_global_quota', v.toString());
                                                }}
                                                className="w-20 bg-slate-950 border border-indigo-900/50 rounded flex items-center justify-end px-2 py-1 text-xs text-white font-bold outline-none focus:border-indigo-500 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1">
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                                            {(() => {
                                                const heavyUsers = users.filter(u => u.generations_used >= globalQuota).sort((a,b) => b.generations_used - a.generations_used);
                                                if (heavyUsers.length === 0) {
                                                    return <div className="p-4 text-center text-slate-500 italic text-sm">No active users above {globalQuota}</div>;
                                                }
                                                return heavyUsers.map(u => {
                                                    return (
                                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-indigo-950/20 border-indigo-900/30 shadow-sm">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white text-sm max-w-[160px] truncate">{u.display_name || u.full_name || 'Anonymous'}</span>
                                                                <span className="text-[10px] font-black uppercase text-indigo-400 mt-1">
                                                                    Generated {u.generations_used}+ images
                                                                </span>
                                                            </div>
                                                            <div className="text-right flex items-center gap-2">
                                                                <div className="text-sm font-black text-white px-2 py-1 bg-indigo-900/40 rounded border border-indigo-800/50">
                                                                    {u.generations_used} <span className="text-indigo-300 text-[10px] uppercase ml-1">Gens</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Analytics Charts */}
                            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl mt-6 backdrop-blur-sm">
                                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                                            <BarChart3 className="text-indigo-400" size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white uppercase tracking-tight leading-none text-sm md:text-base">Usage & Cost Analytics</h3>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Growth Trends • {stats?.daily.length} Days Period</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <DateRangePicker 
                                            startDate={startDate}
                                            endDate={endDate}
                                            onChange={(start, end) => {
                                                setStartDate(start);
                                                setEndDate(end);
                                            }}
                                        />
                                        <button
                                            onClick={loadStats}
                                            disabled={loadingStats}
                                            className="h-10 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {loadingStats ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                                            {loadingStats ? 'LOADING...' : 'REFRESH'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 space-y-12">
                                    {!stats?.daily || stats.daily.length === 0 ? (
                                        <div className="text-center py-32 text-slate-600 border-2 border-dashed border-slate-800/50 rounded-3xl bg-slate-950/20">
                                            <div className="flex justify-center mb-4 opacity-20"><BarChart3 size={48} /></div>
                                            <p className="text-sm font-bold uppercase tracking-widest">Awaiting System Data</p>
                                            <p className="text-xs mt-2 opacity-50">Select a date range and click refresh to populate analytics</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-16 relative">
                                            {/* SHARED TOOLTIP OVERLAY */}
                                            {hoveredIndex !== null && stats.daily[hoveredIndex] && (() => {
                                                const pct = (hoveredIndex / (stats.daily.length - 1 || 1)) * 100;
                                                let translateX = '-50%';
                                                if (pct < 15) translateX = '0%';
                                                else if (pct > 85) translateX = '-100%';

                                                return (
                                                    <div
                                                        className="absolute top-0 bottom-0 pointer-events-none z-50 transition-all duration-200 ease-out"
                                                        style={{ left: `${pct}%` }}
                                                    >
                                                        <div className="w-[1px] h-full bg-slate-700/50 absolute top-0 left-0"></div>
                                                        <div
                                                            className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap absolute top-[50%] -translate-y-full mb-4"
                                                            style={{ transform: `translateX(${translateX})` }}
                                                        >
                                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 border-b border-slate-700 pb-1">
                                                                {new Date(stats.daily[hoveredIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center justify-between gap-12">
                                                                    <span className="text-[11px] text-slate-400 font-bold uppercase">Volume</span>
                                                                    <span className="text-xs text-indigo-400 font-black">{stats.daily[hoveredIndex].count} Gens</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-12">
                                                                    <span className="text-[11px] text-slate-400 font-bold uppercase">Budget</span>
                                                                    <span className="text-xs text-emerald-400 font-black">${formatCost(stats.daily[hoveredIndex].cost)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {(() => {
                                                if (!stats?.daily || stats.daily.length === 0) return (
                                                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl">
                                                        <div className="p-12 text-center text-slate-500 italic">No activity data available for this range.</div>
                                                    </div>
                                                );

                                                const maxCount = stats.daily.reduce((max, d) => Math.max(max, d.count), 0);
                                                const maxCost = stats.daily.reduce((max, d) => Math.max(max, d.cost), 0);
                                                const dMaxCount = Math.max(maxCount, 1);
                                                const dMaxCost = Math.max(maxCost, 0.1);

                                                return (
                                                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-12">
                                                        {/* Chart 1: Volume */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-end justify-between px-2">
                                                                <div>
                                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Scale: Generations</h4>
                                                                    <div className="text-xl md:text-2xl font-black text-white italic">Activity Volume</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Peak Volume</div>
                                                                    <div className="text-xl font-black text-indigo-400">{maxCount}</div>
                                                                </div>
                                                            </div>

                                                            <div className="h-64 w-full relative group/chart">
                                                                {/* Y-Axis Labels */}
                                                                <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[8px] font-black text-slate-700 uppercase py-2 pointer-events-none">
                                                                    <span>{maxCount} —</span>
                                                                    <span>{Math.round(maxCount / 2)} —</span>
                                                                    <span>0 —</span>
                                                                </div>

                                                                <div className="h-full w-full flex items-end gap-[1px] border-b border-slate-800 pb-2 relative z-10" onMouseLeave={() => setHoveredIndex(null)}>
                                                                    {stats.daily.map((day, idx) => {
                                                                        const height = (day.count / dMaxCount) * 100;
                                                                        return (
                                                                            <div
                                                                                key={day.date}
                                                                                className="flex-1 h-full flex flex-end group/bar relative cursor-crosshair"
                                                                                onMouseEnter={() => setHoveredIndex(idx)}
                                                                            >
                                                                                <div
                                                                                    className={`w-full bg-gradient-to-t from-indigo-600/60 to-indigo-400 transition-all rounded-t-lg shadow-[0_0_15px_rgba(99,102,241,0.15)] self-end ${hoveredIndex === idx ? 'opacity-100 scale-x-110 shadow-indigo-500/30' : 'opacity-40'}`}
                                                                                    style={{ height: `${Math.max(height, day.count > 0 ? 3 : 0)}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Chart 2: Cost Flow */}
                                                        <div className="space-y-6 px-0">
                                                            <div className="flex items-end justify-between px-2">
                                                                <div>
                                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Scale: Dollars (USD)</h4>
                                                                    <div className="text-xl md:text-2xl font-black text-white italic">Financial Flow</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Spend</div>
                                                                    <div className="text-xl font-black text-emerald-400">${formatCost(maxCost)}</div>
                                                                </div>
                                                            </div>

                                                            <div className="h-72 w-full relative">
                                                                {/* Y-Axis Labels */}
                                                                <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-between text-[8px] font-black text-slate-700 uppercase py-4 pointer-events-none">
                                                                    <span>${formatCost(maxCost)} —</span>
                                                                    <span>${formatCost(maxCost / 2)} —</span>
                                                                    <span>$0,0 —</span>
                                                                </div>

                                                                <div className="h-full w-full relative group/area" onMouseLeave={() => setHoveredIndex(null)}>
                                                                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                                                        <defs>
                                                                            <linearGradient id="premiumFlow" x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                                                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        {(() => {
                                                                            const widthStep = 100 / (stats.daily.length - 1 || 1);

                                                                            const points = stats.daily.map((d, i) => ({
                                                                                x: i * widthStep,
                                                                                y: 100 - (d.cost / dMaxCost) * 85 - 5
                                                                            }));

                                                                            const linePath = points.map(p => `${p.x},${p.y}`).join(' ');
                                                                            const areaPath = `0,100 ${linePath} 100,100`;

                                                                            return (
                                                                                <>
                                                                                    {/* Horizontal Guidelines */}
                                                                                    {[10, 30, 50, 70, 90].map(v => (
                                                                                        <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="#1e293b" strokeWidth="0.2" strokeDasharray="1,2" />
                                                                                    ))}

                                                                                    <polygon points={areaPath} fill="url(#premiumFlow)" className="transition-all duration-700 ease-out" />
                                                                                    <polyline
                                                                                        points={linePath}
                                                                                        fill="none"
                                                                                        stroke="#10b981"
                                                                                        strokeWidth="1.5"
                                                                                        vectorEffect="non-scaling-stroke"
                                                                                        strokeLinejoin="round"
                                                                                        strokeLinecap="round"
                                                                                        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))' }}
                                                                                        className="transition-all duration-700 ease-out"
                                                                                    />

                                                                                    {points.map((p, i) => (
                                                                                        <rect
                                                                                            key={i}
                                                                                            x={p.x - widthStep / 2}
                                                                                            y="0"
                                                                                            width={widthStep}
                                                                                            height="100"
                                                                                            className="fill-transparent cursor-crosshair pointer-events-auto"
                                                                                            onMouseEnter={() => setHoveredIndex(i)}
                                                                                        />
                                                                                    ))}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </svg>
                                                                </div>
                                                            </div>

                                                            {/* X-AXIS TIMELINE */}
                                                            <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800 mt-4">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(stats.daily[0].date).toLocaleDateString('en-GB')}</span>
                                                                <div className="flex-1 flex justify-center gap-1 opacity-10">
                                                                    {Array.from({ length: 15 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-slate-500"></div>)}
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(stats.daily[stats.daily.length - 1].date).toLocaleDateString('en-GB')}</span>
                                                            </div>
                                                        </div>

                                                        {/* explicitly listed day by day statistics */}
                                                        <div className="mt-8 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                                                            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                                                                <h3 className="font-bold text-white uppercase tracking-tight text-sm">Day-by-Day Detailed Statistics</h3>
                                                            </div>
                                                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                                                <table className="w-full text-left text-sm relative">
                                                                    <thead className="bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-widest sticky top-0 z-10 shadow-md">
                                                                        <tr>
                                                                            <th className="px-6 py-4">Date</th>
                                                                            <th className="px-6 py-4 text-center">Volume (Gens)</th>
                                                                            <th className="px-6 py-4 text-right">Cost (USD)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-800/50">
                                                                        {[...stats.daily].reverse().map(day => (
                                                                            <tr key={day.date} className="hover:bg-slate-800/30 transition-colors">
                                                                                <td className="px-6 py-3 font-mono text-slate-300 text-xs">{new Date(day.date).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '.')}</td>
                                                                                <td className="px-6 py-3 text-center font-black text-indigo-400">{day.count}</td>
                                                                                <td className="px-6 py-3 text-right font-black text-emerald-500">${formatCost(day.cost)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

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
            </div >

            <HistoryModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={{ id: selectedUser?.id || '', full_name: selectedUser?.full_name || null }}
                history={userHistory}
                onLoadMore={loadMoreHistory}
                hasMore={userHistory.length < historyTotal}
                loadingMore={loadingMoreHistory}
            />

            {
                loadingHistory && (
                    <div className="fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="animate-spin text-indigo-500" size={48} />
                    </div>
                )
            }
        </div >
    );
};

export default AdminPage;
