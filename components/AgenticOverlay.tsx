import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Activity, X, Sparkles, Monitor, MonitorOff } from 'lucide-react';
import { useAgentic } from '../contexts/AgenticContext';

const AgenticOverlay: React.FC = () => {
    const {
        isActive,
        toggleAgenticMode,
        status,
        lastUserMessage,
        lastAgentMessage,
        startListening,
        stopListening,
        screenShareEnabled,
        toggleScreenShare
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
            {(lastUserMessage || lastAgentMessage || status === 'connecting' || status === 'reconnecting') && expanded && (
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
                    {status === 'connecting' && (
                        <div className="self-start text-slate-400 text-xs animate-pulse flex items-center gap-1">
                            <Activity size={12} /> Connecting to Gemini Live...
                        </div>
                    )}
                    {status === 'reconnecting' && (
                        <div className="self-start text-yellow-400 text-xs animate-pulse flex items-center gap-1">
                            <Activity size={12} /> Reconnecting...
                        </div>
                    )}
                </div>
            )}

            {/* Main Orb / Controller */}
            <div className={`bg-slate-900 border border-slate-700 rounded-full p-2 flex items-center gap-2 shadow-xl transition-all duration-300 ${status === 'connected' ? 'ring-2 ring-green-500/50' : ''} ${status === 'connecting' ? 'ring-2 ring-yellow-500/50' : ''} ${status === 'reconnecting' ? 'ring-2 ring-orange-500/50 animate-pulse' : ''}`}>

                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center relative overflow-hidden">
                    {status === 'connecting' || status === 'reconnecting' ? (
                        <div className="absolute inset-0 bg-white/20 animate-spin-slow" style={{ borderRadius: '40%' }}></div>
                    ) : null}
                    {status === 'connected' ? (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ borderRadius: '50%' }}></div>
                    ) : null}
                    <Sparkles size={20} className="text-white relative z-10" />
                </div>

                <div className="flex items-center gap-1 px-2">
                    <button
                        onClick={status === 'connected' ? stopListening : startListening}
                        className={`p-2 rounded-full transition-colors ${status === 'connected' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title={status === 'connected' ? "Disconnect" : "Connect"}
                    >
                        {status === 'connected' ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                        onClick={toggleScreenShare}
                        className={`p-2 rounded-full transition-colors ${screenShareEnabled ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title={screenShareEnabled ? "Screen sharing enabled" : "Screen sharing disabled"}
                    >
                        {screenShareEnabled ? <Monitor size={20} /> : <MonitorOff size={20} />}
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
