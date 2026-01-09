
/**
 * Service to interact with Freepik API for Magnific Upscale
 * Works in both development (via Vite proxy) and production (via Netlify function)
 */

export interface FreepikUpscaleResponse {
    data: {
        task_id: string;
        status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
        generated: string[];
    };
}

export const upscaleImageFreepik = async (image: string, prompt?: string): Promise<string> => {
    const isDev = import.meta.env.DEV;
    const apiKey = import.meta.env.VITE_FREEPIK_API_KEY;

    if (!apiKey && isDev) {
        throw new Error("Freepik API key not found in .env");
    }

    console.log("[Freepik] Starting Magnific upscale...");

    // Remove data:image/X;base64, prefix if present
    const base64Image = image.includes('base64,') ? image.split('base64,')[1] : image;

    let taskId: string;

    // 1. Initiate Upscale
    const initResponse = await fetch(isDev ? '/api/freepik/ai/image-upscaler' : '/.netlify/functions/freepik-proxy', {
        method: 'POST',
        headers: isDev ? {
            'x-freepik-api-key': apiKey,
            'Content-Type': 'application/json'
        } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDev ? {
            image: base64Image,
            scale_factor: '2x',
            optimized_for: 'standard',
            prompt: prompt || 'high quality, detailed render'
        } : {
            path: '/ai/image-upscaler',
            method: 'POST',
            body: {
                image: base64Image,
                scale_factor: '2x',
                optimized_for: 'standard',
                prompt: prompt || 'high quality, detailed render'
            }
        })
    });

    if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Freepik API Error: ${initResponse.status}`);
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

        const pollResponse = await fetch(isDev ? `/api/freepik/ai/image-upscaler/${taskId}` : '/.netlify/functions/freepik-proxy', {
            method: isDev ? 'GET' : 'POST',
            headers: isDev ? {
                'x-freepik-api-key': apiKey
            } : { 'Content-Type': 'application/json' },
            body: isDev ? undefined : JSON.stringify({
                path: `/ai/image-upscaler/${taskId}`,
                method: 'GET'
            })
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
