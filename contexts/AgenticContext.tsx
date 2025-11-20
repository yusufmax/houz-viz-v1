import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { RealtimeClient } from '../services/realtimeClient';

interface AgenticContextType {
    isActive: boolean;
    toggleAgenticMode: () => void;
    status: 'connected' | 'disconnected' | 'connecting';
    isListening: boolean; // Kept for compatibility, maps to connected
    isProcessing: boolean; // Kept for compatibility
    isSpeaking: boolean; // Kept for compatibility
    lastUserMessage: string | null;
    lastAgentMessage: string | null;
    startListening: () => void;
    stopListening: () => void;
}

const AgenticContext = createContext<AgenticContextType | undefined>(undefined);

export const AgenticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const [lastAgentMessage, setLastAgentMessage] = useState<string | null>(null);

    const clientRef = useRef<RealtimeClient | null>(null);

    useEffect(() => {
        // Initialize client on mount, but don't connect yet
        clientRef.current = new RealtimeClient({
            onText: (text) => {
                setLastAgentMessage(prev => (prev || '') + text);
            },
            onToolCall: (toolCall) => {
                console.log("Tool Call:", toolCall);
                // Handle tool calls (e.g. switch mode)
                // For V1 of realtime, we might need to parse text or implement tool handlers
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

    return (
        <AgenticContext.Provider value={{
            isActive,
            toggleAgenticMode,
            status,
            isListening: status === 'connected',
            isProcessing: status === 'connecting',
            isSpeaking: false, // Realtime handles audio playback internally
            lastUserMessage,
            lastAgentMessage,
            startListening,
            stopListening
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
