import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Trash2, FolderOpen, Plus, Image as ImageIcon, Edit2, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quotaService } from '../../services/quotaService';

interface Project {
    id: string;
    name: string;
    description: string;
    updated_at: string;
    user_id: string;
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

    useEffect(() => {
        if (user) {
            fetchProjects();
            fetchReferences();
            fetchQuota();
        }
    }, [user]);

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
            // Only fetch metadata, not the full 'data' field which contains all images
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, description, updated_at, user_id')
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

    const openProject = (project: Project) => {
        // Navigate to Infinity Mode with projectId
        navigate(`/?mode=infinity&projectId=${project.id}`);
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            {/* ... (Header and Quota sections) */}

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
                ) : referenceImages.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <ImageIcon size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-400 mb-4">No custom reference images yet.</p>
                        <p className="text-sm text-slate-500">Upload your own reference images to use in Linear Mode</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {referenceImages.map(ref => (
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
                    onClick={() => navigate('/')}
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
                        onClick={() => navigate('/')}
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
        </div >
    );
};

export default ProfilePage;
