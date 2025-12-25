
import React, { useState } from 'react';
import { X, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { quotaService } from '../services/quotaService';

interface CreditRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const CreditRequestModal: React.FC<CreditRequestModalProps> = ({ isOpen, onClose, userId }) => {
    const [amount, setAmount] = useState<number>(50);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await quotaService.requestCredits(userId, amount);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 3000);
        } catch (error) {
            alert('Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm shadow-2xl" onClick={onClose}></div>
            <div className="relative bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header Decoration */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                            <Zap size={24} />
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-8 text-center animate-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="text-emerald-500" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Request Submitted</h2>
                            <p className="text-slate-400">Admins will review your request shortly. You'll receive a notification on approval.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Need more credits?</h2>
                                <p className="text-slate-400 text-sm">Tell us how many generations you need and our admins will review it.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Amount Needed</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[20, 50, 100].map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setAmount(v)}
                                                className={`py-3 rounded-xl border-2 transition-all font-black ${amount === v
                                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Or Custom Amount</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                                        className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl py-3 px-4 text-white font-bold outline-none transition-all"
                                        placeholder="Enter amount..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-100 transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Submit Request <Zap size={18} className="group-hover:fill-indigo-500 group-hover:text-indigo-500 transition-all" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditRequestModal;
