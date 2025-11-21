// Official Kling AI API
const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_API_BASE = 'https://api-singapore.klingai.com/v1';

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
            // Generate video from image using official Kling AI API
            const requestBody = {
                model_name: params.model || 'kling-v1',
                duration: String(params.duration || 5),
                image: params.image,
                prompt: params.prompt || '',
                cfg_scale: params.cfgScale || 0.5
            };

            // Add optional parameters
            if (params.mode) requestBody.mode = params.mode;
            if (params.aspectRatio) requestBody.aspect_ratio = params.aspectRatio;

            const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KLING_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Kling API error:', errorText);
                throw new Error(`Kling API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();

            // Return task_id for polling
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    task_id: data.data?.task_id || data.task_id
                })
            };

        } else if (action === 'poll') {
            // Poll for video status using task_id
            const response = await fetch(`${KLING_API_BASE}/videos/image2video/${params.task_id}`, {
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
            // Kling API statuses: 'submitted', 'processing', 'succeed', 'failed'
            let status = 'pending';
            if (data.data?.task_status === 'succeed') status = 'completed';
            else if (data.data?.task_status === 'failed') status = 'failed';
            else if (data.data?.task_status === 'processing') status = 'processing';

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: status,
                    video_url: data.data?.task_result?.videos?.[0]?.url || null,
                    error_message: data.data?.task_status_msg || null
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
