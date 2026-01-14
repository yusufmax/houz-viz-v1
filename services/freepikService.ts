import { FreepikMagnificSettings } from '../types';

export interface FreepikUpscaleResponse {
    data: {
        task_id: string;
        status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
        generated: string[];
    };
}

export const upscaleImageFreepik = async (image: string, settings?: Partial<FreepikMagnificSettings>): Promise<string> => {
    const isDev = import.meta.env.DEV;
    const apiKey = import.meta.env.VITE_FREEPIK_API_KEY;

    if (!apiKey && isDev) {
        throw new Error("Freepik API key not found in .env");
    }

    console.log("[Freepik] Starting Magnific upscale...");

    // Remove data:image/X;base64, prefix if present
    const base64Image = image.includes('base64,') ? image.split('base64,')[1] : image;

    const requestBody = {
        image: base64Image,
        scale_factor: settings?.scale_factor || '2x',
        optimized_for: settings?.optimized_for || 'standard',
        prompt: settings?.prompt || 'high quality, detailed render',
        creativity: settings?.creativity ?? 0,
        hdr: settings?.definition ?? 0,
        resemblance: settings?.resemblance ?? 0,
        fractality: settings?.intricacy ?? 0,
        engine: settings?.engine || 'automatic'
    };

    let taskId: string;

    // 1. Initiate Upscale
    // 1. Initiate Upscale - Unified Path for Dev (Vite) and Prod (server.cjs)
    const initResponse = await fetch('/api/freepik/ai/image-upscaler', {
        method: 'POST',
        headers: {
            // 'x-freepik-api-key': apiKey, // Handled by Proxy (Vite or server.cjs)
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        console.error("[Freepik] Init Error Details:", errorData);
        throw new Error(errorData.message || errorData.error || `Freepik API Error: ${initResponse.status}`);
    }

    const initData: FreepikUpscaleResponse = await initResponse.json();
    taskId = initData.data.task_id;
    console.log("[Freepik] Task created:", taskId);

    // 2. Poll for Status
    let status: FreepikUpscaleResponse['data']['status'] = 'CREATED';
    let resultUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5s interval

    while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));

        const pollResponse = await fetch(`/api/freepik/ai/image-upscaler/${taskId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!pollResponse.ok) {
            console.error("[Freepik] Polling failed", pollResponse.status);
            continue;
        }

        const pollData: FreepikUpscaleResponse = await pollResponse.json();
        status = pollData.data.status;
        console.log(`[Freepik] Status: ${status} (${attempts})`);

        if (status === 'COMPLETED' && pollData.data.generated.length > 0) {
            resultUrl = pollData.data.generated[0];
            break;
        }
    }

    if (status === 'FAILED') {
        throw new Error("Freepik upscaling failed");
    }

    if (!resultUrl) {
        throw new Error("Upscaling timed out or failed to return image");
    }

    console.log("[Freepik] Success:", resultUrl);
    return resultUrl;
};
