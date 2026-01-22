import { FreepikMagnificSettings } from '../types';

export interface FreepikUpscaleResponse {
    data: {
        task_id: string;
        status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
        generated: string[];
    };
}

export const upscaleImageFreepik = async (imageInput: string, settings?: Partial<FreepikMagnificSettings>): Promise<string> => {
    // Helper to resize image if needed
    const ensureSafeDimensions = async (base64Data: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const MAX_PIXELS = 16 * 1000 * 1000; // 16MP safety limit (allow room for upscale)
                const currentPixels = img.width * img.height;

                if (currentPixels <= MAX_PIXELS) {
                    resolve(base64Data);
                    return;
                }

                console.log(`[Freepik] Image too large (${img.width}x${img.height} = ${(currentPixels / 1e6).toFixed(1)}MP). Resizing...`);

                // Calculate new dimensions maintaining aspect ratio
                const scale = Math.sqrt(MAX_PIXELS / currentPixels);
                const newWidth = Math.floor(img.width * scale);
                const newHeight = Math.floor(img.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                // Return as base64 (JPEG 90% quality for efficiency)
                const resized = canvas.toDataURL('image/jpeg', 0.90);
                // Remove prefix for API
                resolve(resized.split('base64,')[1]);
            };
            img.onerror = (e) => reject(new Error("Failed to load image for resizing"));
            img.src = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
        });
    };

    const isDev = import.meta.env.DEV;
    const apiKey = import.meta.env.VITE_FREEPIK_API_KEY;

    if (!apiKey && isDev) {
        throw new Error("Freepik API key not found in .env");
    }

    console.log("[Freepik] Starting Magnific upscale...");

    let base64Image = imageInput;

    // Handle URL input: Download and convert to Base64
    // Handle URL input: Download and convert to Base64
    if (imageInput.startsWith('http')) {
        try {
            console.log("[Freepik] Input is URL, downloading to convert to Base64...");
            const resp = await fetch(imageInput);
            const blob = await resp.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            base64Image = base64;
        } catch (err) {
            console.error("[Freepik] Failed to convert URL to Base64:", err);
            throw new Error("Failed to process input image URL");
        }
    } else if (imageInput.includes('base64,')) {
        // Remove prefix if present
        base64Image = imageInput.split('base64,')[1];
    }

    // DEBUG: Clean and logging
    base64Image = base64Image.replace(/[\n\r]/g, '').trim();

    // Resize checks
    try {
        base64Image = await ensureSafeDimensions(base64Image);
    } catch (err) {
        console.error("[Freepik] Resize check-in failed:", err);
        // Continue with original just in case it works
    }

    console.log(`[Freepik] Final Base64 Length: ${base64Image.length}`);

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
            'x-freepik-api-key': apiKey, // Handled by Proxy (Vite or server.cjs)
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
