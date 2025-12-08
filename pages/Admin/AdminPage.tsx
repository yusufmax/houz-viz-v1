
import React, { useEffect, useState } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthProvider';
import { Loader2, Users, Save, X, Edit2, ShieldAlert } from 'lucide-react';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuota, setEditQuota] = useState<number>(0);

    useEffect(() => {
        loadUsers();
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
        setEditQuota(u.generation_quota || 20); // Default to 20 if null
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
                            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                            <p className="text-slate-400 text-sm">Manage visible users and quotas</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-slate-400">
                        <Users size={16} />
                        <span>{users.length} Users Visible</span>
                    </div>
                </header>

                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-medium text-xs">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Used</th>
                                <th className="px-6 py-4 text-center">Quota</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No users found with admin visibility enabled.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.full_name || 'User'} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                                        <Users size={20} className="text-slate-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-white">{u.full_name || 'Unknown User'}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{u.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
                                                Active
                                            </span>
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
                                                        className="w-20 bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-center outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <span className={`font-mono font-bold ${u.generation_quota > u.generations_used ? 'text-indigo-400' : 'text-red-400'}`}>
                                                    {u.generation_quota}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {editingId === u.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => saveQuota(u.id)}
                                                        className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                                                        title="Save"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(u)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors mx-auto border border-slate-700"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
