// Official Kling AI API - Based on official documentation
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
            // Map our model names to official Kling model names
            const modelMap = {
                'kling-v1': 'kling-v1',
                'kling-v1-5': 'kling-v1-5',
                'kling-v2-1': 'kling-v2-1',
                'kling-v2-5-turbo': 'kling-v2-5-turbo'
            };

            // Build request body according to official API spec
            const requestBody = {
                model_name: modelMap[params.model] || 'kling-v1',
                duration: String(params.duration || 5), // Must be string: "5" or "10"
                image: params.image, // Base64 or URL
                prompt: params.prompt || ''
            };

            // Add optional parameters based on model support
            // cfg_scale only supported by kling-v1 models
            if (params.model === 'kling-v1' || params.model === 'kling-v1-5') {
                requestBody.cfg_scale = params.cfgScale || 0.5;
            }

            // mode parameter (std or pro)
            if (params.mode) {
                requestBody.mode = params.mode;
            }

            // negative_prompt if provided
            if (params.negativePrompt) {
                requestBody.negative_prompt = params.negativePrompt;
            }

            console.log('Kling API Request:', {
                model_name: requestBody.model_name,
                duration: requestBody.duration,
                mode: requestBody.mode,
                has_image: !!requestBody.image
            });

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
                console.error('Kling API error:', response.status, errorText);
                throw new Error(`Kling API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Kling API Response:', data);

            // Check for API-level errors
            if (data.code !== 0) {
                throw new Error(data.message || 'Kling API returned error code');
            }

            // Return task_id for polling
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    task_id: data.data?.task_id,
                    task_status: data.data?.task_status
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
                console.error('Kling polling error:', response.status, errorText);
                throw new Error(`Kling polling error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Check for API-level errors
            if (data.code !== 0) {
                throw new Error(data.message || 'Kling API returned error code');
            }

            // Transform response to match our expected format
            // Official API statuses: 'submitted', 'processing', 'succeed', 'failed'
            let status = 'pending';
            const taskStatus = data.data?.task_status;

            if (taskStatus === 'succeed') status = 'completed';
            else if (taskStatus === 'failed') status = 'failed';
            else if (taskStatus === 'processing') status = 'processing';
            else if (taskStatus === 'submitted') status = 'pending';

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: status,
                    video_url: data.data?.task_result?.videos?.[0]?.url || null,
                    error_message: data.data?.task_status_msg || null,
                    duration: data.data?.task_result?.videos?.[0]?.duration || null
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
