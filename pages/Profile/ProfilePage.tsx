import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Trash2, FolderOpen, Plus, Image as ImageIcon, Edit2, X, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quotaService } from '../../services/quotaService';
import CreditRequestModal from '../../components/CreditRequestModal';
import { historyService } from '../../services/historyService';
import { HistoryItem } from '../../types';

interface Project {
    id: string;
    name: string;
    description: string;
    updated_at: string;
    user_id: string;
    data: any; // Include data to check project type
}

import {
    fetchUserReferenceImages,
    uploadReferenceImage,
    updateReferenceImage,
    deleteReferenceImage,
    ReferenceImage
} from '../../services/referenceImageService';

const ProfilePage: React.FC = () => {
    const { user, signOut } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
    const [loadingReferences, setLoadingReferences] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
    const navigate = useNavigate();

    // Project Generations Grid States
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectGenerations, setProjectGenerations] = useState<HistoryItem[]>([]);
    const [loadingGenerations, setLoadingGenerations] = useState(false);

    const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchProjects();
            fetchReferences();
            fetchQuota();
            fetchProfile();
        }
    }, [user?.id]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
        if (data) {
            setUserDisplayName(data.display_name);
        }
    };

    const fetchQuota = async () => {
        if (!user) return;
        try {
            const q = await quotaService.getUserQuota(user.id);
            if (q) {
                setQuota({ used: q.used, limit: q.quota });
            }
        } catch (error) {
            console.error('Error fetching quota:', error);
        }
    };

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, description, updated_at, user_id, data') // Fetch data to check type
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteProject = async (id: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) throw error;
            setProjects(projects.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const openProject = async (project: Project) => {
        if (project.data?.type === 'linear') {
            setSelectedProject(project);
            setLoadingGenerations(true);
            try {
                if (user) {
                    const history = await historyService.getHistory(user.id, project.id);
                    setProjectGenerations(history);
                }
            } catch (error) {
                console.error('Error fetching project history:', error);
            } finally {
                setLoadingGenerations(false);
            }
        } else {
            navigate(`/editor?mode=infinity&projectId=${project.id}`);
        }
    };

    const fetchReferences = async () => {
        if (!user) return;
        setLoadingReferences(true);
        try {
            const refs = await fetchUserReferenceImages(user.id);
            setReferenceImages(refs);
        } catch (error) {
            console.error('Error fetching reference images:', error);
        } finally {
            setLoadingReferences(false);
        }
    };

    const [uploadCategory, setUploadCategory] = useState<'exterior' | 'interior'>('exterior');

    // Helper to resize image to max 720px
    const resizeImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 720;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/jpeg', 0.85);
            };
            img.onerror = (err) => reject(err);
            img.src = URL.createObjectURL(file);
        });
    };

    const handleUploadReference = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const name = prompt('Enter a name for this reference image:', file.name.split('.')[0]);
            if (!name) {
                setUploading(false);
                return;
            }

            // Resize image
            const resizedFile = await resizeImage(file);

            const newRef = await uploadReferenceImage(user.id, resizedFile, name, uploadCategory);
            setReferenceImages([...referenceImages, newRef]);
        } catch (error: any) {
            alert(error.message || 'Failed to upload reference image');
        } finally {
            setUploading(false);
        }
    };

    // ... (rest of functions)

    const handleUpdateReference = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await updateReferenceImage(id, editName);
            setReferenceImages(referenceImages.map(ref =>
                ref.id === id ? { ...ref, name: editName } : ref
            ));
            setEditingId(null);
            setEditName('');
        } catch (error) {
            console.error('Error updating reference:', error);
        }
    };

    const handleDeleteReference = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reference image?')) return;
        try {
            await deleteReferenceImage(id);
            setReferenceImages(referenceImages.filter(ref => ref.id !== id));
        } catch (error) {
            console.error('Error deleting reference:', error);
        }
    };

    // Filter images based on selected category
    const filteredImages = referenceImages.filter(ref => {
        const category = ref.category || 'general';
        // If category is 'general', show it in 'exterior' (default behavior requested previously) 
        // or should we show it in both? 
        // The user's prompt said "toggle... allowing selection between 'Interior' and 'Exterior'".
        // And the upload defaults to 'general' if not specified, but the UI sets it to 'exterior' or 'interior'.
        // Existing images might be 'general'.
        // Let's map 'general' to 'exterior' for display purposes if that's the default tab.
        if (category === 'general') return uploadCategory === 'exterior';
        return category === uploadCategory;
    });

    const [showRequestModal, setShowRequestModal] = useState(false);

    if (selectedProject) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-white flex items-center gap-2 bg-slate-900/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors">
                            <ChevronLeft size={16} /> Back to Projects
                        </button>
                        <h1 className="text-3xl font-black text-white">{selectedProject.name}</h1>
                    </div>
                    <button 
                        onClick={() => navigate(`/editor?mode=${selectedProject.data?.type || 'linear'}&projectId=${selectedProject.id}`)} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        <Edit2 size={16} /> Open in Editor
                    </button>
                </div>

                {loadingGenerations ? (
                    <div className="text-center text-slate-500 py-12">Loading generations...</div>
                ) : projectGenerations.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <ImageIcon size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-400 mb-4">No generations found for this project.</p>
                        <button 
                            onClick={() => navigate(`/editor?mode=${selectedProject.data?.type || 'linear'}&projectId=${selectedProject.id}`)}
                            className="text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            Start Generating
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {projectGenerations.map(gen => (
                            <div 
                                key={gen.id} 
                                className="relative group rounded-xl overflow-hidden cursor-pointer border border-slate-800 hover:border-indigo-500 transition-colors"
                                onClick={() => navigate(`/editor?mode=${selectedProject.data?.type || 'linear'}&projectId=${selectedProject.id}&historyId=${gen.id}`)}
                            >
                                <img src={gen.url} alt={gen.prompt} className="w-full h-full object-cover aspect-square bg-slate-900" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-white text-xs font-bold bg-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <Edit2 size={12} /> Edit State
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Command Center</h1>
                    <p className="text-slate-400">Manage your architectural assets, projects, and creative capacity.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Quota Card */}
                    {quota && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                <Zap size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Creative Credits</div>
                                <div className="flex items-end gap-2 text-white">
                                    <span className="text-2xl font-black leading-none">{quota.limit - quota.used}</span>
                                    <span className="text-slate-500 text-xs font-bold pb-0.5">/ {quota.limit} REMAINING</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Profile Edit Section */}
                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} className="w-full h-full rounded-full" alt="Avatar" />
                        ) : (
                            <ImageIcon size={20} />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Display Name</div>
                        {editingId === 'profile-name' ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-sm text-white outline-none w-48"
                                    placeholder="Enter display name"
                                    autoFocus
                                />
                                <button
                                    onClick={async () => {
                                        if (!user) return;
                                        try {
                                            const { error } = await supabase
                                                .from('profiles')
                                                .update({ display_name: editName })
                                                .eq('id', user.id);

                                            if (error) throw error;

                                            // Update local user metadata if possible or just rely on re-fetch?
                                            // Ideally we should update context, but a refresh works.
                                            alert("Display name updated!");
                                            setEditingId(null);
                                        } catch (err) {
                                            console.error(err);
                                            alert("Failed to update name");
                                        }
                                    }}
                                    className="p-1 bg-green-600 rounded hover:bg-green-500 text-white"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-lg">
                                    {/* We need to fetch the profile first to get display_name, user object only has auth metadata usually */}
                                    {/* The profile fetching logic seems missing in this page, it fetched projects/refs/quota but maybe not profile? */}
                                    {/* I'll add a fetchProfile call or rely on what we have. */}
                                    {/* For now let's assume we can fetch it. I need to add profile state. */}
                                    {userDisplayName || user?.user_metadata?.full_name || user?.email}
                                </span>
                                <button
                                    onClick={() => {
                                        setEditingId('profile-name');
                                        setEditName(userDisplayName || user?.user_metadata?.full_name || '');
                                    }}
                                    className="text-slate-500 hover:text-indigo-400 p-1"
                                >
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <CreditRequestModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                userId={user?.id || ''}
            />

            {/* Reference Images Section */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Reference Images</h2>
                    <div className="flex items-center gap-4">
                        {/* Category Toggle */}
                        <div className="bg-slate-900 p-1 rounded-lg flex border border-slate-800">
                            <button
                                onClick={() => setUploadCategory('exterior')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadCategory === 'exterior'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Exterior
                            </button>
                            <button
                                onClick={() => setUploadCategory('interior')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadCategory === 'interior'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Interior
                            </button>
                        </div>

                        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUploadReference}
                                disabled={uploading || referenceImages.length >= 20}
                                className="hidden"
                            />
                            <Plus size={16} />
                            {uploading ? 'Uploading...' : 'Add Image'}
                        </label>
                    </div>
                </div>

                {loadingReferences ? (
                    <div className="text-center py-12 text-slate-500">Loading references...</div>
                ) : filteredImages.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <ImageIcon size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-400 mb-4">No {uploadCategory} reference images yet.</p>
                        <p className="text-sm text-slate-500">Upload your own reference images to use in Linear Mode</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {filteredImages.map(ref => (
                            <div key={ref.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group relative">
                                <div className="aspect-square overflow-hidden">
                                    <img
                                        src={ref.image_url}
                                        alt={ref.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    {editingId === ref.id ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                                                autoFocus
                                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateReference(ref.id)}
                                            />
                                            <button
                                                onClick={() => handleUpdateReference(ref.id)}
                                                className="text-green-400 hover:text-green-300 p-1"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setEditName(''); }}
                                                className="text-slate-400 hover:text-slate-300 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-300 truncate flex-1">{ref.name}</p>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingId(ref.id); setEditName(ref.name); }}
                                                    className="text-slate-400 hover:text-indigo-400 p-1"
                                                    title="Edit name"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReference(ref.id)}
                                                    className="text-slate-400 hover:text-red-400 p-1"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {referenceImages.length >= 20 && (
                    <p className="text-xs text-slate-500 mt-4 text-center">Maximum of 20 reference images reached</p>
                )}
            </div>

            {/* Projects Section */}
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Your Projects</h2>
                <button
                    onClick={() => navigate('/editor?mode=linear')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Plus size={16} /> New Project
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading projects...</div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-400 mb-4">No projects saved yet.</p>
                    <button
                        onClick={() => navigate('/editor?mode=linear')}
                        className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                        Start creating
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <div key={project.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                                    <FolderOpen size={20} />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                                    className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2"
                                    title="Delete Project"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 className="font-semibold text-white mb-1 truncate">{project.name}</h3>
                            <p className="text-xs text-slate-500 mb-4">Last updated: {new Date(project.updated_at).toLocaleDateString()}</p>
                            <button
                                onClick={() => openProject(project)}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Open Project
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
