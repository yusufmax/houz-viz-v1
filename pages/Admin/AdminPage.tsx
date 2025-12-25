
import React, { useEffect, useState } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthProvider';
import { Loader2, Users, Save, X, Edit2, ShieldAlert, Ban, Trash2, History, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HistoryModal from '../../components/Admin/HistoryModal';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
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

            loadUsers();
        };
        init();
    }, [user]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getVisibleUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
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

    const toggleBan = async (u: AdminUser) => {
        const action = u.is_banned ? "Unban" : "Ban";
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this user?`)) return;

        try {
            await adminService.banUser(u.id, !u.is_banned);
            setUsers(users.map(user => user.id === u.id ? { ...user, is_banned: !user.is_banned } : user));
        } catch (error) {
            alert(`Failed to ${action.toLowerCase()} user`);
        }
    };

    const deleteUser = async (u: AdminUser) => {
        if (!confirm(`DANGER: Are you sure you want to delete ${u.full_name || u.id}? This will remove all their data and profile. Auth record will remain.`)) return;

        try {
            await adminService.deleteUser(u.id);
            setUsers(users.filter(user => user.id !== u.id));
        } catch (error) {
            alert("Failed to delete user");
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
                <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                            <ShieldAlert className="text-red-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Admin Control</h1>
                            <p className="text-slate-400 text-sm">Account standing, quotas, and creative history</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-slate-400">
                        <Users size={16} />
                        <span>{users.length} Users</span>
                    </div>
                </header>

                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">User Identity</th>
                                <th className="px-6 py-4 text-center">Standing</th>
                                <th className="px-6 py-4 text-center">Usage</th>
                                <th className="px-6 py-4 text-center">Quota</th>
                                <th className="px-6 py-4 text-right pr-12">Security Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No users matching administrative filters.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${u.is_banned ? 'bg-red-900/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.full_name || 'User'} className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-lg" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                                                        <Users size={24} className="text-slate-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white text-base">{u.full_name || 'Unknown User'}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                        <span className="opacity-50 select-none">ID:</span> {u.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {u.is_banned ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-900/30 text-red-500 border border-red-500/20">
                                                    <Ban size={12} /> Banned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-slate-300">
                                            {u.generations_used}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {editingId === u.id ? (
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="number"
                                                        value={editQuota}
                                                        onChange={(e) => setEditQuota(Number(e.target.value))}
                                                        className="w-20 bg-slate-800 border-2 border-indigo-500 rounded-lg px-2 py-1 text-center outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-bold"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <span className={`font-mono font-black text-lg ${u.generation_quota > u.generations_used ? 'text-indigo-400' : 'text-red-400/50'}`}>
                                                    {u.generation_quota}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingId === u.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveQuota(u.id)}
                                                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/20"
                                                            title="Save"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                                                            title="Cancel"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => viewHistory(u)}
                                                            className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700"
                                                            title="View History"
                                                        >
                                                            <History size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => startEditing(u)}
                                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700"
                                                            title="Edit Quota"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleBan(u)}
                                                            className={`p-2 rounded-lg transition-all border ${u.is_banned ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white'}`}
                                                            title={u.is_banned ? "Unban User" : "Ban User"}
                                                        >
                                                            <Ban size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(u)}
                                                            className="p-2 bg-slate-900 hover:bg-red-900 text-slate-600 hover:text-white rounded-lg transition-all border border-slate-800"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={18} />
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

                {/* Legend / Info */}
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
                        <AlertTriangle size={12} className="text-yellow-500" />
                        <span>Delete only removes app profile and history</span>
                    </div>
                </div>
            </div>

            {/* History Modal */}
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
