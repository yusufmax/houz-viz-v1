import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';

const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;
const KLING_API_BASE = 'https://api-singapore.klingai.com/v1';

// Generate JWT token for Kling AI API authentication
function generateJWT(accessKey: string, secretKey: string): string {
    try {
        const payload = {
            iss: accessKey,
            exp: Math.floor(Date.now() / 1000) + 1800, // Current time + 30 minutes
            nbf: Math.floor(Date.now() / 1000) - 5 // Current time - 5 seconds
        };

        const token = jwt.sign(payload, secretKey, {
            algorithm: 'HS256',
            header: {
                alg: 'HS256',
                typ: 'JWT'
            }
        });

        return token;
    } catch (error) {
        console.error('JWT Generation Error:', error);
        throw new Error('Failed to generate authentication token');
    }
}

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

    // Check for required credentials
    if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
        console.error('Missing Kling AI credentials');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Server configuration error: Missing Kling AI credentials',
                details: 'Please set KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables'
            })
        };
    }

    try {
        const { action, ...params } = JSON.parse(event.body || '{}');
        console.log(`[Kling API] Action: ${action}`, { model: params.model, duration: params.duration });

        // Generate JWT token for authentication
        const jwtToken = generateJWT(KLING_ACCESS_KEY, KLING_SECRET_KEY);
        const authHeader = `Bearer ${jwtToken}`;

        if (action === 'generate') {
            // Map our model names to official Kling model names
            const modelMap: Record<string, string> = {
                'kling-v1': 'kling-v1',
                'kling-v1-5': 'kling-v1-5',
                'kling-v2-1': 'kling-v2-1',
                'kling-v2-5-turbo': 'kling-v2-5-turbo'
            };

            // Build request body according to official API spec
            // Ensure image is stripped of data URI prefix if present
            const base64Image = params.image.replace(/^data:image\/\w+;base64,/, '');

            const requestBody: any = {
                model_name: modelMap[params.model] || 'kling-v1',
                duration: String(params.duration || 5), // Must be string: "5" or "10"
                image: base64Image, // Base64 without prefix
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

            console.log('[Kling API] Sending request to:', `${KLING_API_BASE}/videos/image2video`);
            // Log payload but truncate image data
            const logPayload = { ...requestBody };
            if (logPayload.image && logPayload.image.length > 100) {
                logPayload.image = '[BASE64_IMAGE_TRUNCATED]';
            }
            console.log('[Kling API] Request payload:', JSON.stringify(logPayload));

            const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Kling API] Error Response:', response.status, response.statusText, errorText);
                throw new Error(`Kling API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[Kling API] Success Response:', JSON.stringify(data));

            // Check for API-level errors
            if (data.code !== 0) {
                console.error('[Kling API] API returned error code:', data.code, data.message);
                throw new Error(data.message || `Kling API error code: ${data.code}`);
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
            console.log('[Kling API] Polling task:', params.task_id);

            // Poll for video status using task_id
            const response = await fetch(`${KLING_API_BASE}/videos/image2video/${params.task_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Kling API] Polling Error:', response.status, errorText);
                throw new Error(`Kling polling error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[Kling API] Poll Response:', JSON.stringify(data));

            // Check for API-level errors
            if (data.code !== 0) {
                throw new Error(data.message || `Kling API error code: ${data.code}`);
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

    } catch (error: any) {
        console.error('[Kling API] Function Error:', error);
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
