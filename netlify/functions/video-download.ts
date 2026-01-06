import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle initial OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    const { url } = event.queryStringParameters || {};

    if (!url) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing video URL' })
        };
    }

    try {
        console.log(`[Video Download] Proxying URL: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const base64Body = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'video/mp4';

        // Extract filename from URL or use default
        const urlObj = new URL(url);
        let filename = urlObj.pathname.split('/').pop() || `houz-video-${Date.now()}.mp4`;
        if (!filename.toLowerCase().endsWith('.mp4')) {
            filename += '.mp4';
        }

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
            body: base64Body,
            isBase64Encoded: true
        };
    } catch (error: any) {
        console.error('[Video Download] Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to proxy video download',
                details: error.message
            })
        };
    }
};
