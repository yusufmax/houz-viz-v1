// AI/ML API Proxy for Kling Video Generation
const AIML_API_KEY = process.env.AIML_API_KEY;

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
            // Map frontend model names to AI/ML API model IDs
            const modelMap = {
                'kling-v1': 'kling-video/v1/standard/image-to-video',
                'kling-v1-5': 'kling-video/v1/standard/image-to-video', // Fallback if v1.5 not supported
                'kling-v2-1': 'kling-video/v1/standard/image-to-video', // Fallback
                'kling-v2-5-turbo': 'kling-video/v1/standard/image-to-video' // Fallback
            };

            // Generate video from image using AI/ML API
            const requestBody = {
                model: modelMap[params.model] || params.model || 'kling-video/v1/standard/image-to-video',
                image_url: params.image,
                prompt: params.prompt || '',
                duration: params.duration || 5,
                aspect_ratio: params.aspectRatio || '16:9',
                cfg_scale: params.cfgScale || 0.5
            };

            const response = await fetch('https://api.aimlapi.com/v2/generate/video/kling/generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AIML_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('AI/ML API error:', errorText);
                throw new Error(`AI/ML API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Return task_id for polling
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    task_id: data.task_id || data.id
                })
            };

        } else if (action === 'poll') {
            // Poll for video status using task_id
            const response = await fetch(`https://api.aimlapi.com/v2/generate/video/kling/status/${params.task_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AIML_API_KEY}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('AI/ML polling error:', errorText);
                throw new Error(`AI/ML polling error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Transform response to match our expected format
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: data.status,
                    video_url: data.video_url || data.output_url || null,
                    error_message: data.error || null
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
