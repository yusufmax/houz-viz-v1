import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { geminiAgent } from '../services/geminiAgent';

interface AgenticContextType {
    isActive: boolean;
    toggleAgenticMode: () => void;
    isListening: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    lastUserMessage: string | null;
    lastAgentMessage: string | null;
    startListening: () => void;
    stopListening: () => void;
}

const AgenticContext = createContext<AgenticContextType | undefined>(undefined);

export const AgenticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const [lastAgentMessage, setLastAgentMessage] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);

            recognitionRef.current.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                setLastUserMessage(transcript);
                handleUserMessage(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
        }
    }, []);

    const handleUserMessage = async (message: string) => {
        setIsProcessing(true);
        try {
            // TODO: Capture screenshot here if needed for vision
            const response = await geminiAgent.chat(message);

            setLastAgentMessage(response.text);
            speak(response.text);

            if (response.action) {
                console.log("Executing action:", response.action);
                // Execute action logic here or expose it
                // For now, we'll just log it. In a real app, we'd have a command dispatcher.
                if (response.action.type === 'SWITCH_MODE') {
                    // Dispatch event or call context method to switch mode
                    // This requires access to the App's state or a global store
                    window.dispatchEvent(new CustomEvent('agent-action', { detail: response.action }));
                }
            }

        } catch (error) {
            console.error("Error processing message:", error);
            speak("Sorry, something went wrong.");
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = (text: string) => {
        if (synthesisRef.current) {
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setIsSpeaking(false);
            synthesisRef.current.speak(utterance);
        }
    };

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    const toggleAgenticMode = () => {
        setIsActive(!isActive);
    };

    return (
        <AgenticContext.Provider value={{
            isActive,
            toggleAgenticMode,
            isListening,
            isProcessing,
            isSpeaking,
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
