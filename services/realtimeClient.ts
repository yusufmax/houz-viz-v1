import { AudioManager } from './audioManager';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HOST = 'generativelanguage.googleapis.com';
const URI = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

export interface RealtimeClientCallbacks {
    onText: (text: string) => void;
    onToolCall: (toolCall: any) => void;
    onStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export class RealtimeClient {
    private ws: WebSocket | null = null;
    private audioManager: AudioManager;
    private callbacks: RealtimeClientCallbacks;

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

        this.callbacks.onStatusChange('connecting');
        const url = `${URI}?key=${API_KEY}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("Connected to Gemini Realtime");
            this.callbacks.onStatusChange('connected');
            this.sendSetupMessage();
            this.audioManager.startRecording();
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
            console.log("Disconnected from Gemini Realtime", event.code, event.reason);
            this.callbacks.onStatusChange('disconnected');
            this.audioManager.stopRecording();
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
            this.callbacks.onStatusChange('disconnected');
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.audioManager.stopRecording();
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
        const msg = {
            realtime_input: {
                media_chunks: [
                    {
                        mime_type: "audio/pcm;rate=24000",
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
            this.ws.send(JSON.stringify(data));
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
