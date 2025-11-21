// Use AI/ML API as the provider for Kling AI
const KLING_API_KEY = process.env.KLING_API_KEY;
const API_BASE = 'https://api.aimlapi.com';

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { action, ...params } = JSON.parse(event.body || '{}');

        if (action === 'generate') {
            // Generate video from image using AI/ML API
            const response = await fetch(`${API_BASE}/v2/generate/video/kling/generation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KLING_API_KEY}`
                },
                body: JSON.stringify({
                    model: params.model || 'kling-v1-5',
                    image_url: params.image, // Can be URL or base64
                    prompt: params.prompt || '',
                    duration: params.duration || 5,
                    aspect_ratio: params.aspectRatio || '16:9',
                    cfg_scale: params.cfgScale || 0.5
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Kling API error:', errorText);
                throw new Error(`Kling API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };

        } else if (action === 'poll') {
            // Poll for video status using task_id
            const response = await fetch(`${API_BASE}/v2/generate/video/kling/generation/${params.task_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${KLING_API_KEY}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Kling polling error:', errorText);
                throw new Error(`Kling polling error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Transform response to match our expected format
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: data.status, // 'pending', 'processing', 'completed', 'failed'
                    video_url: data.output?.video_url || data.video_url,
                    error_message: data.error
                })
            };

        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action. Use "generate" or "poll"' })
            };
        }

    } catch (error) {
        console.error('Kling video function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error',
                details: error.toString()
            })
        };
    }
};

