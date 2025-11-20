import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { RealtimeClient } from '../services/realtimeClient';

interface AgenticContextType {
    isActive: boolean;
    toggleAgenticMode: () => void;
    status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
    isListening: boolean; // Kept for compatibility, maps to connected
    isProcessing: boolean; // Kept for compatibility
    isSpeaking: boolean; // Kept for compatibility
    lastUserMessage: string | null;
    lastAgentMessage: string | null;
    startListening: () => void;
    stopListening: () => void;
    screenShareEnabled: boolean;
    toggleScreenShare: () => void;
    setToolExecutor: (executor: (toolName: string, args: any) => void) => void;
}

const AgenticContext = createContext<AgenticContextType | undefined>(undefined);

export const AgenticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const [lastAgentMessage, setLastAgentMessage] = useState<string | null>(null);
    const [screenShareEnabled, setScreenShareEnabled] = useState(true); // Enabled by default

    const clientRef = useRef<RealtimeClient | null>(null);
    const toolExecutorRef = useRef<((toolName: string, args: any) => void) | null>(null);

    useEffect(() => {
        // Initialize client on mount, but don't connect yet
        clientRef.current = new RealtimeClient({
            onText: (text) => {
                setLastAgentMessage(prev => (prev || '') + text);
            },
            onToolCall: (toolCall) => {
                console.log("🔧 Tool Call:", toolCall);
                // Execute tool if executor is set
                if (toolExecutorRef.current) {
                    // Handle both formats: direct call or functionCalls array
                    if (toolCall.functionCalls && Array.isArray(toolCall.functionCalls)) {
                        // Array format from Gemini API
                        toolCall.functionCalls.forEach((fc: any) => {
                            if (fc.name && fc.args && toolExecutorRef.current) {
                                toolExecutorRef.current(fc.name, fc.args);
                            }
                        });
                    } else if (toolCall.name && toolCall.args) {
                        // Direct format
                        toolExecutorRef.current(toolCall.name, toolCall.args);
                    }
                }
            },
            onStatusChange: (newStatus) => {
                setStatus(newStatus);
            }
        });

        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (isActive) {
            clientRef.current?.connect();
        } else {
            clientRef.current?.disconnect();
        }
    }, [isActive]);

    const toggleAgenticMode = () => {
        setIsActive(!isActive);
    };

    const startListening = () => {
        // In realtime mode, "start listening" is implicit when connected.
        // But we can use this to manually reconnect if needed.
        if (!isActive) setIsActive(true);
    };

    const stopListening = () => {
        if (isActive) setIsActive(false);
    };

    const toggleScreenShare = () => {
        const newValue = !screenShareEnabled;
        setScreenShareEnabled(newValue);
        if (newValue) {
            clientRef.current?.startScreenCapture?.();
        } else {
            clientRef.current?.stopScreenCapture?.();
        }
    };

    const setToolExecutor = (executor: (toolName: string, args: any) => void) => {
        toolExecutorRef.current = executor;
    };

    return (
        <AgenticContext.Provider value={{
            isActive,
            toggleAgenticMode,
            status,
            isListening: status === 'connected',
            isProcessing: status === 'connecting' || status === 'reconnecting',
            isSpeaking: false, // Realtime handles audio playback internally
            lastUserMessage,
            lastAgentMessage,
            startListening,
            stopListening,
            screenShareEnabled,
            toggleScreenShare,
            setToolExecutor
        }}>
            {children}
        </AgenticContext.Provider>
    );
};

export const useAgentic = () => {
    const context = useContext(AgenticContext);
    if (context === undefined) {
        throw new Error('useAgentic must be used within an AgenticProvider');
    }
    return context;
};
