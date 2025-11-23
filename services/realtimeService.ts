
export class RealtimeService {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private onTextCallback: ((text: string) => void) | null = null;

    constructor(private apiKey: string, private model: string = "gemini-2.0-flash-exp") { }

    connect(onText: (text: string) => void, onError: (error: any) => void) {
        this.onTextCallback = onText;
        const host = "generativelanguage.googleapis.com";
        const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        try {
            this.ws = new WebSocket(uri);

            this.ws.onopen = () => {
                console.log("Connected to Gemini Realtime API");
                this.isConnected = true;
                this.sendSetupMessage();
            };

            this.ws.onmessage = async (event) => {
                try {
                    let responseData = event.data;
                    if (responseData instanceof Blob) {
                        responseData = await responseData.text();
                    }

                    const response = JSON.parse(responseData);
                    this.handleResponse(response);
                } catch (e) {
                    console.error("Error parsing WebSocket message:", e);
                }
            };

            this.ws.onclose = () => {
                console.log("Gemini Realtime API connection closed");
                this.isConnected = false;
            };

            this.ws.onerror = (error) => {
                console.error("Gemini Realtime API error:", error);
                onError(error);
            };

        } catch (error) {
            console.error("Failed to connect to Gemini Realtime API:", error);
            onError(error);
        }
    }

    private sendSetupMessage() {
        if (!this.ws || !this.isConnected) return;

        const setupMessage = {
            setup: {
                model: `models/${this.model}`,
                generationConfig: {
                    responseModalities: ["TEXT"], // We only want text back
                },
                systemInstruction: {
                    parts: [
                        { text: "You are a voice-to-text transcriber. Your ONLY job is to output the exact text of what the user speaks. Do NOT converse. Do NOT answer questions. Do NOT say 'Sorry'. Do NOT ignore input. If the user speaks, output the text immediately." }
                    ]
                }
            }
        };

        this.ws.send(JSON.stringify(setupMessage));
    }

    sendAudioChunk(base64PCM: string) {
        if (!this.ws || !this.isConnected) return;

        const audioMessage = {
            realtimeInput: {
                mediaChunks: [
                    {
                        mimeType: "audio/pcm",
                        data: base64PCM
                    }
                ]
            }
        };

        this.ws.send(JSON.stringify(audioMessage));
    }

    private handleResponse(response: any) {
        if (response.serverContent && response.serverContent.modelTurn) {
            const parts = response.serverContent.modelTurn.parts;
            if (parts) {
                parts.forEach((part: any) => {
                    if (part.text && this.onTextCallback) {
                        this.onTextCallback(part.text);
                    }
                });
            }
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}
