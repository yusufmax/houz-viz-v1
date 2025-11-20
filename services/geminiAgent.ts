import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY in environment variables");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

export interface AgentResponse {
    text: string;
    action?: {
        type: 'SWITCH_MODE' | 'UPDATE_PROMPT' | 'GENERATE_IMAGE' | 'UNKNOWN';
        payload?: any;
    };
}

export const geminiAgent = {
    /**
     * Sends a prompt to Gemini with optional image context (screenshot).
     */
    async chat(prompt: string, imageBase64?: string): Promise<AgentResponse> {
        try {
            // Use Gemini 2.5 Flash for speed and multimodal capabilities
            const model = 'gemini-2.5-flash';

            let contents: any = {
                parts: [{ text: prompt }]
            };

            if (imageBase64) {
                // Remove data prefix if present
                const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

                contents.parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/png",
                    },
                });
            }

            const result = await ai.models.generateContent({
                model: model,
                contents: contents
            });

            const responseText = result.text || "I didn't catch that.";

            // Simple parsing logic to detect actions from the response text
            let action: AgentResponse['action'] = undefined;

            const lowerText = responseText.toLowerCase();
            if (lowerText.includes("switch to infinity mode")) {
                action = { type: 'SWITCH_MODE', payload: 'infinity' };
            } else if (lowerText.includes("switch to linear mode")) {
                action = { type: 'SWITCH_MODE', payload: 'linear' };
            }

            return {
                text: responseText,
                action
            };

        } catch (error) {
            console.error("Error communicating with Gemini:", error);
            return {
                text: "I'm sorry, I'm having trouble connecting to my brain right now.",
            };
        }
    }
};