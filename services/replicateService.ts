
/**
 * Service to interact with Replicate API for Recraft Crisp Upscale
 * Works in both development (via Vite proxy) and production (via Netlify function)
 */
export const upscaleImageReplicate = async (image: string): Promise<string> => {
    const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
    if (!token) {
        throw new Error("Replicate API token not found");
    }

    console.log("[Replicate] Starting upscale...");

    // Use Netlify function in production, Vite proxy in development
    const isDev = import.meta.env.DEV;

    let prediction: any;

    if (isDev) {
        // Development: Use Vite proxy
        const response = await fetch('/api/replicate/models/recraft-ai/recraft-crisp-upscale/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: {
                    image: image,
                    output_format: "png"
                }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(err.detail || `Replicate API Error: ${response.status}`);
        }

        prediction = await response.json();
        console.log("[Replicate] Prediction started:", prediction.id);

        // Poll for completion
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const pollUrl = prediction.urls.get.replace('https://api.replicate.com/v1', '/api/replicate');
            const statusRes = await fetch(pollUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!statusRes.ok) throw new Error("Polling failed");
            prediction = await statusRes.json();
            console.log("[Replicate] Status:", prediction.status);
        }
    } else {
        // Production: Use Netlify function
        const response = await fetch('/.netlify/functions/replicate-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: '/models/recraft-ai/recraft-crisp-upscale/predictions',
                method: 'POST',
                body: {
                    input: {
                        image: image,
                        output_format: "png"
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(err.error || `Replicate API Error: ${response.status}`);
        }

        prediction = await response.json();
        console.log("[Replicate] Prediction started:", prediction.id);

        // Poll for completion
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const getPath = prediction.urls.get.replace('https://api.replicate.com/v1', '');
            const statusRes = await fetch('/.netlify/functions/replicate-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: getPath,
                    method: 'GET'
                })
            });
            if (!statusRes.ok) throw new Error("Polling failed");
            prediction = await statusRes.json();
            console.log("[Replicate] Status:", prediction.status);
        }
    }

    if (prediction.status !== "succeeded") {
        console.error("[Replicate] Prediction failed:", prediction);
        throw new Error(`Upscale failed: ${prediction.error}`);
    }

    console.log("[Replicate] Success:", prediction.output);
    return prediction.output;
};
