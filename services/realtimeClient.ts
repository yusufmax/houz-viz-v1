import { AudioManager } from './audioManager';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HOST = 'generativelanguage.googleapis.com';
const URI = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

export interface RealtimeClientCallbacks {
    onText: (text: string) => void;
    onToolCall: (toolCall: any) => void;
    onStatusChange: (status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting') => void;
}

export class RealtimeClient {
    private ws: WebSocket | null = null;
    private audioManager: AudioManager;
    private callbacks: RealtimeClientCallbacks;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 1000; // Start with 1 second
    private keepAliveInterval: number | null = null;
    private isManualDisconnect = false;

    constructor(callbacks: RealtimeClientCallbacks) {
        this.callbacks = callbacks;
        this.audioManager = new AudioManager((base64PCM) => {
            this.sendAudio(base64PCM);
        });
    }

    connect() {
        if (!API_KEY) {
            console.error("Missing API Key");
            return;
        }

        this.isManualDisconnect = false;
        this.callbacks.onStatusChange(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
        const url = `${URI}?key=${API_KEY}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("✅ Connected to Gemini Realtime");
            this.reconnectAttempts = 0; // Reset on successful connection
            this.reconnectDelay = 1000;
            this.callbacks.onStatusChange('connected');
            this.sendSetupMessage();
            this.audioManager.startRecording();
            this.startKeepAlive();
        };

        this.ws.onmessage = async (event) => {
            try {
                let data;
                if (event.data instanceof Blob) {
                    data = JSON.parse(await event.data.text());
                } else {
                    data = JSON.parse(event.data);
                }
                this.handleServerMessage(data);
            } catch (e) {
                console.error("Error parsing message:", e);
            }
        };

        this.ws.onclose = (event) => {
            console.log(`🔌 Disconnected from Gemini Realtime [Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}]`);
            this.stopKeepAlive();
            this.audioManager.stopRecording();

            // Don't reconnect if it was a manual disconnect
            if (!this.isManualDisconnect) {
                this.handleReconnect(event.code);
            } else {
                this.callbacks.onStatusChange('disconnected');
            }
        };

        this.ws.onerror = (error) => {
            console.error("❌ WebSocket Error:", error);
            // onclose will be called after onerror, so we handle reconnection there
        };
    }

    disconnect() {
        this.isManualDisconnect = true;
        this.reconnectAttempts = 0;
        this.stopKeepAlive();
        if (this.ws) {
            this.ws.close(1000, "Manual disconnect"); // 1000 = normal closure
            this.ws = null;
        }
        this.audioManager.stopRecording();
        this.callbacks.onStatusChange('disconnected');
    }

    private handleReconnect(closeCode: number) {
        // Don't reconnect on certain close codes (e.g., authentication failure)
        if (closeCode === 1008 || closeCode === 1003) {
            console.error("🚫 Cannot reconnect: Authentication or protocol error");
            this.callbacks.onStatusChange('disconnected');
            return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                if (!this.isManualDisconnect) {
                    this.connect();
                }
            }, delay);
        } else {
            console.error("❌ Max reconnection attempts reached. Please reconnect manually.");
            this.callbacks.onStatusChange('disconnected');
        }
    }

    private startKeepAlive() {
        this.stopKeepAlive(); // Clear any existing interval

        // Send a ping every 30 seconds to keep connection alive
        this.keepAliveInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Send an empty client_content as a keep-alive
                this.send({ client_content: {} });
                console.log("💓 Keep-alive ping sent");
            }
        }, 30000);
    }

    private stopKeepAlive() {
        if (this.keepAliveInterval !== null) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    private sendSetupMessage() {
        const setup = {
            setup: {
                model: "models/gemini-2.0-flash-exp", // Using the experimental model for realtime
                generation_config: {
                    response_modalities: ["AUDIO", "TEXT"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: "Puck" // or "Charon", "Kore", "Fenrir", "Aoede"
                            }
                        }
                    }
                }
            }
        };
        this.send(setup);
    }

    private sendAudio(base64PCM: string) {
        // Check buffer before sending to prevent overflow
        if (this.ws && this.ws.bufferedAmount > 1024 * 1024) { // 1MB threshold
            console.warn("⚠️ WebSocket buffer full, skipping audio chunk");
            return;
        }

        const msg = {
            realtime_input: {
                media_chunks: [
                    {
                        mime_type: "audio/pcm;rate=16000",
                        data: base64PCM
                    }
                ]
            }
        };
        this.send(msg);
    }

    // TODO: Implement video/screen sending
    sendScreenCapture(base64Image: string) {
        const msg = {
            realtime_input: {
                media_chunks: [
                    {
                        mime_type: "image/jpeg",
                        data: base64Image
                    }
                ]
            }
        };
        this.send(msg);
    }

    private send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (e) {
                console.error("Failed to send message:", e);
            }
        } else {
            console.warn("⚠️ Cannot send message: WebSocket not open (state:", this.ws?.readyState, ")");
        }
    }

    private handleServerMessage(data: any) {
        // Handle Server Content
        if (data.serverContent) {
            const { modelTurn } = data.serverContent;
            if (modelTurn) {
                for (const part of modelTurn.parts) {
                    if (part.text) {
                        this.callbacks.onText(part.text);
                    }
                    if (part.inlineData) {
                        // Audio chunk
                        this.audioManager.playAudioChunk(part.inlineData.data);
                    }
                    if (part.executableCode) {
                        // Handle code execution if needed
                    }
                }
            }

            if (data.serverContent.turnComplete) {
                // Turn complete
            }
        }

        // Handle Tool Calls
        if (data.toolCall) {
            this.callbacks.onToolCall(data.toolCall);
        }
    }
}
