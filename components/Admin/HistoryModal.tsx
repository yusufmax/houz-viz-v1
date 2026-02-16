
import React from 'react';
import { X, ExternalLink, Clock, Tag } from 'lucide-react';
import { historyService } from '../../services/historyService';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { id: string, full_name: string | null };
    history: any[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, user, history, onLoadMore, hasMore, loadingMore }) => {
    const [loadingQueueIndex, setLoadingQueueIndex] = React.useState(0);

    React.useEffect(() => {
        if (isOpen) {
            setLoadingQueueIndex(0);
        }
    }, [isOpen, user.id]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Generation History</h2>
                        <p className="text-sm text-slate-400">Viewing assets for {user.full_name || user.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                    {history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Clock size={48} className="opacity-20" />
                            <p>No generations found for this user.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {history.map((item, index) => (
                                    <div key={item.id} className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden group hover:border-indigo-500/50 transition-all shadow-lg">
                                        <div className="aspect-square relative overflow-hidden bg-slate-950">
                                            <img
                                                src={index <= loadingQueueIndex ? historyService.getOptimizedUrl(item.image_url) : ''}
                                                alt={item.prompt}
                                                className={`w-full h-full object-cover transition-all duration-500 ${index <= loadingQueueIndex ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
                                                loading="eager"
                                                onLoad={() => setLoadingQueueIndex(prev => Math.max(prev, index + 1))}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    // Try original URL if optimized fails
                                                    if (target.src !== item.image_url && index <= loadingQueueIndex) {
                                                        target.src = item.image_url;
                                                    } else {
                                                        // Determine next index and proceed
                                                        setLoadingQueueIndex(prev => Math.max(prev, index + 1));
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                <a
                                                    href={item.image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                >
                                                    <ExternalLink size={14} /> View Original
                                                </a>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                                    <Tag size={10} /> {item.style || 'Standard'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                                                {item.prompt || 'No prompt provided'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {hasMore && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={onLoadMore}
                                        disabled={loadingMore}
                                        className="px-6 py-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingMore ? (
                                            <>Loading...</>
                                        ) : (
                                            <>Load More History</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
                    <span>Showing {history.length} items</span>
                    <span className="font-mono">{user.id}</span>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
