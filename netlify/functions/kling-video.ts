import { Handler } from '@netlify/functions';

const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_API_BASE = 'https://api.klingai.com/v1';

export const handler: Handler = async (event) => {
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
            // Generate video from image
            const response = await fetch(`${KLING_API_BASE}/images/generations/image-to-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KLING_API_KEY}`
                },
                body: JSON.stringify({
                    image: params.image,
                    model: params.model,
                    duration: params.duration,
                    aspect_ratio: params.aspectRatio,
                    prompt: params.prompt || '',
                    cfg_scale: params.cfgScale || 0.5,
                    camera_movement: params.cameraMovement
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Kling API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };

        } else if (action === 'poll') {
            // Poll for video status
            const response = await fetch(`${KLING_API_BASE}/tasks/${params.task_id}`, {
                headers: {
                    'Authorization': `Bearer ${KLING_API_KEY}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Kling API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };

        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action. Use "generate" or "poll"' })
            };
        }

    } catch (error: any) {
        console.error('Kling video function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
