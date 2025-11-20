import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Activity, X, Sparkles } from 'lucide-react';
import { useAgentic } from '../contexts/AgenticContext';

const AgenticOverlay: React.FC = () => {
    const {
        isActive,
        toggleAgenticMode,
        isListening,
        isProcessing,
        isSpeaking,
        lastUserMessage,
        lastAgentMessage,
        startListening,
        stopListening
    } = useAgentic();

    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (isActive) {
            setExpanded(true);
        }
    }, [isActive]);

    if (!isActive) {
        return (
            <button
                onClick={toggleAgenticMode}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-105 transition-transform z-50"
                title="Open Agentic Mode"
            >
                <Sparkles size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">

            {/* Chat Bubble Area */}
            {(lastUserMessage || lastAgentMessage) && expanded && (
                <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4 w-80 shadow-2xl mb-2 flex flex-col gap-3">
                    {lastUserMessage && (
                        <div className="self-end bg-indigo-600/20 text-indigo-100 px-3 py-2 rounded-xl rounded-tr-none text-sm">
                            {lastUserMessage}
                        </div>
                    )}
                    {lastAgentMessage && (
                        <div className="self-start bg-slate-800 text-slate-200 px-3 py-2 rounded-xl rounded-tl-none text-sm">
                            {lastAgentMessage}
                        </div>
                    )}
                    {isProcessing && (
                        <div className="self-start text-slate-400 text-xs animate-pulse flex items-center gap-1">
                            <Activity size={12} /> Thinking...
                        </div>
                    )}
                </div>
            )}

            {/* Main Orb / Controller */}
            <div className={`bg-slate-900 border border-slate-700 rounded-full p-2 flex items-center gap-2 shadow-xl transition-all duration-300 ${isListening ? 'ring-2 ring-red-500/50' : ''} ${isSpeaking ? 'ring-2 ring-green-500/50' : ''}`}>

                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center relative overflow-hidden">
                    {isProcessing ? (
                        <div className="absolute inset-0 bg-white/20 animate-spin-slow" style={{ borderRadius: '40%' }}></div>
                    ) : null}
                    <Sparkles size={20} className="text-white relative z-10" />
                </div>

                <div className="flex items-center gap-1 px-2">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                        onClick={toggleAgenticMode}
                        className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgenticOverlay;
