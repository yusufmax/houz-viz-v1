const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { promises: fsPromises } = fs;

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm'
};

// -------------------------------------------------------
// KLING AI HELPERS
// -------------------------------------------------------
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;
const KLING_API_BASE = 'https://api-singapore.klingai.com/v1';

function generateKlingJWT(accessKey, secretKey) {
    try {
        const payload = {
            iss: accessKey,
            exp: Math.floor(Date.now() / 1000) + 1800,
            nbf: Math.floor(Date.now() / 1000) - 5
        };
        const token = jwt.sign(payload, secretKey, {
            algorithm: 'HS256',
            header: { alg: 'HS256', typ: 'JWT' }
        });
        return token;
    } catch (error) {
        console.error('JWT Generation Error:', error);
        throw new Error('Failed to generate authentication token');
    }
}

const server = http.createServer(async (req, res) => {
    // -------------------------------------------------------
    // 1. API PROXY: Freepik
    // -------------------------------------------------------
    if (req.url.startsWith('/api/freepik/')) {
        const targetPath = req.url.replace('/api/freepik', ''); // /v1/ai/image-upscaler...
        const targetUrl = `https://api.freepik.com/v1${targetPath}`;
        const apiKey = process.env.VITE_FREEPIK_API_KEY;

        if (!apiKey) {
            console.error('❌ Missing VITE_FREEPIK_API_KEY in environment');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server configuration error: Missing API Key' }));
            return;
        }

        console.log(`🔄 Proxying Freepik: ${targetPath}`);

        try {
            // Read body for POST/PUT
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const body = Buffer.concat(buffers);

            const proxyRes = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    'x-freepik-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
            });

            // Forward status and headers
            res.writeHead(proxyRes.status, {
                'Content-Type': 'application/json'
            });

            const data = await proxyRes.text(); // Get as text first for safety
            res.end(data);

        } catch (err) {
            console.error('❌ Proxy Error:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Proxy failed: ${err.message}` }));
        }
        return;
    }

    // -------------------------------------------------------
    // 2. API PROXY: Replicate (if needed)
    // -------------------------------------------------------
    if (req.url.startsWith('/api/replicate/')) {
        const targetPath = req.url.replace('/api/replicate', '');
        const targetUrl = `https://api.replicate.com/v1${targetPath}`;
        const apiKey = process.env.VITE_REPLICATE_API_TOKEN;

        if (!apiKey) {
            console.error('❌ Missing VITE_REPLICATE_API_TOKEN');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing Replicate Token' }));
            return;
        }

        console.log(`🔄 Proxying Replicate: ${targetPath}`);

        try {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const body = Buffer.concat(buffers);

            const proxyRes = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
            });

            res.writeHead(proxyRes.status, { 'Content-Type': 'application/json' });
            const data = await proxyRes.text();
            res.end(data);

        } catch (err) {
            console.error('❌ Replicate Proxy Error:', err);
            res.writeHead(502);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }
    // -------------------------------------------------------
    // 3. API PROXY: Gemini
    // -------------------------------------------------------
    if (req.url.startsWith('/api/gemini/')) {
        const targetPath = req.url.replace('/api/gemini', '');
        const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('❌ Missing VITE_GEMINI_API_KEY');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing Gemini API Key' }));
            return;
        }

        try {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const body = Buffer.concat(buffers);

            const proxyRes = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    'x-goog-api-key': apiKey,
                    'Content-Type': req.headers['content-type'] || 'application/json'
                },
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
            });

            res.writeHead(proxyRes.status, { 'Content-Type': 'application/json' });
            const data = await proxyRes.text();
            res.end(data);

        } catch (err) {
            console.error('❌ Gemini Proxy Error:', err);
            res.writeHead(502);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // -------------------------------------------------------
    // 4. API PROXY: OpenAI
    // -------------------------------------------------------
    if (req.url.startsWith('/api/openai/')) {
        const targetPath = req.url.replace('/api/openai', '');
        const targetUrl = `https://api.openai.com/v1${targetPath}`;
        const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
            console.error('❌ Missing VITE_OPENAI_API_KEY');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing OpenAI API Key' }));
            return;
        }

        try {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const body = Buffer.concat(buffers);

            const proxyRes = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': req.headers['content-type'] || 'application/json'
                },
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
            });

            res.writeHead(proxyRes.status, { 'Content-Type': 'application/json' });
            const data = await proxyRes.text();
            res.end(data);

        } catch (err) {
            console.error('❌ OpenAI Proxy Error:', err);
            res.writeHead(502);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }
    // 3. API PROXY: Kling Video
    // -------------------------------------------------------
    if (req.url.startsWith('/api/kling-video')) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
        }

        if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
            console.error('❌ Missing Kling AI credentials');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server configuration error: Missing Kling AI credentials' }));
            return;
        }

        try {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const bodyStr = Buffer.concat(buffers).toString();
            const { action, ...params } = JSON.parse(bodyStr || '{}');

            const jwtToken = generateKlingJWT(KLING_ACCESS_KEY, KLING_SECRET_KEY);
            const authHeader = `Bearer ${jwtToken}`;

            if (action === 'generate') {
                const modelMap = {
                    'kling-v1': 'kling-v1',
                    'kling-v1-5': 'kling-v1-5',
                    'kling-v2-1': 'kling-v2-1',
                    'kling-v2-5-turbo': 'kling-v2-5-turbo',
                    'kling-v3': 'kling-v3',
                    'kling-v3-omni': 'kling-v3-omni',
                    'kling-video-o1': 'kling-video-o1'
                };

                let base64Image = params.image;
                let base64EndImage = params.end_image || null;

                // Handle Image URL to Base64
                if (base64Image && (base64Image.startsWith('http://') || base64Image.startsWith('https://'))) {
                    const imgRes = await fetch(base64Image);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    base64Image = Buffer.from(arrayBuffer).toString('base64');
                } else if (base64Image) {
                    base64Image = base64Image.replace(/^data:(image|video)\/\w+;base64,/, '').replace(/\s/g, '');
                }

                if (base64EndImage && (base64EndImage.startsWith('http://') || base64EndImage.startsWith('https://'))) {
                    const endImgRes = await fetch(base64EndImage);
                    const endArrayBuffer = await endImgRes.arrayBuffer();
                    base64EndImage = Buffer.from(endArrayBuffer).toString('base64');
                } else if (base64EndImage) {
                    base64EndImage = base64EndImage.replace(/^data:(image|video)\/\w+;base64,/, '').replace(/\s/g, '');
                }

                const requestBody = {
                    model_name: modelMap[params.model] || 'kling-v1',
                    duration: String(params.duration || 5),
                    image: base64Image,
                    prompt: params.prompt || ''
                };

                if (base64EndImage) requestBody.image_tail = base64EndImage;
                if (params.mode) requestBody.mode = params.mode;
                if (params.negativePrompt) requestBody.negative_prompt = params.negativePrompt;

                const isOmni = requestBody.model_name === 'kling-video-o1' || requestBody.model_name === 'kling-v3-omni';
                
                if (isOmni) {
                    // Convert to Omni format
                    const omniBody = {
                        model_name: requestBody.model_name,
                        duration: requestBody.duration,
                        prompt: requestBody.prompt,
                        mode: requestBody.mode || 'pro',
                        aspect_ratio: params.aspectRatio || '16:9'
                    };
                    
                    if (params.imageReferences && Array.isArray(params.imageReferences) && params.imageReferences.length > 0) {
                         const imageList = [];
                         const videoList = [];
                         params.imageReferences.forEach(url => {
                             if (url.startsWith('data:video/')) {
                                 videoList.push({ video_url: url.replace(/^data:video\/\w+;base64,/, '').replace(/\s/g, '') });
                             } else {
                                 let base64 = url;
                                 if (!url.startsWith('http')) {
                                     base64 = url.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
                                 }
                                 imageList.push({ image_url: base64 });
                             }
                         });
                         if (imageList.length > 0) omniBody.image_list = imageList;
                         if (videoList.length > 0) omniBody.video_list = videoList;
                    } else if (base64Image) {
                         omniBody.image_list = [{ image_url: base64Image, type: 'first_frame' }];
                         if (base64EndImage) {
                             omniBody.image_list.push({ image_url: base64EndImage, type: 'end_frame' });
                         }
                    }
                    
                    const response = await fetch(`${KLING_API_BASE}/videos/omni-video`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': authHeader
                        },
                        body: JSON.stringify(omniBody)
                    });
                    
                    const data = await response.json();
                    res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        task_id: data.data?.task_id,
                        task_status: data.data?.task_status,
                        error: data.code !== 0 ? data.message : undefined
                    }));
                } else {
                    const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': authHeader
                        },
                        body: JSON.stringify(requestBody)
                    });

                    const data = await response.json();
                    res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        task_id: data.data?.task_id,
                        task_status: data.data?.task_status,
                        error: data.code !== 0 ? data.message : undefined
                    }));
                }

            } else if (action === 'poll') {
                const isOmni = params.model === 'kling-video-o1' || params.model === 'kling-v3-omni';
                const endpoint = isOmni ? 'omni-video' : 'image2video';
                const response = await fetch(`${KLING_API_BASE}/videos/${endpoint}/${params.task_id}`, {
                    method: 'GET',
                    headers: { 'Authorization': authHeader }
                });

                const data = await response.json();
                let status = 'pending';
                const taskStatus = data.data?.task_status;

                if (taskStatus === 'succeed') status = 'completed';
                else if (taskStatus === 'failed') status = 'failed';
                else if (taskStatus === 'processing') status = 'processing';
                else if (taskStatus === 'submitted') status = 'pending';

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: status,
                    video_url: data.data?.task_result?.videos?.[0]?.url || null,
                    error_message: data.data?.task_status_msg || null,
                    duration: data.data?.task_result?.videos?.[0]?.duration || null
                }));
            }
        } catch (err) {
            console.error('❌ Kling Proxy Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // -------------------------------------------------------
    // 4. API PROXY: Video Download
    // -------------------------------------------------------
    if (req.url.startsWith('/api/video-download')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const videoUrl = urlParams.get('url');

        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing video URL' }));
            return;
        }

        try {
            console.log(`🔄 Proxying Video Download: ${videoUrl}`);
            const videoRes = await fetch(videoUrl);
            if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.statusText}`);

            const contentType = videoRes.headers.get('content-type') || 'video/mp4';
            const arrayBuffer = await videoRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const filename = path.basename(new URL(videoUrl).pathname) || `video-${Date.now()}.mp4`;

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`
            });
            res.end(buffer);
        } catch (err) {
            console.error('❌ Download Proxy Error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // -------------------------------------------------------
    // 3. STATIC FILE SERVING
    // -------------------------------------------------------
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    let extname = path.extname(filePath);

    // Security: Prevent directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        let stats = await fsPromises.stat(filePath);

        // If directory, try index.html inside
        if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            extname = '.html';
            stats = await fsPromises.stat(filePath);
        }

        const contentType = MIME_TYPES[extname] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (err) {
        if (err.code === 'ENOENT') {
            // SPA Fallback: Serve index.html for 404s (handled by React Router)
            // But NOT for /api/ requests (already handled above, but double check)
            if (req.url.startsWith('/api/')) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API Endpoint not found' }));
                return;
            }

            try {
                const indexHtml = path.join(DIST_DIR, 'index.html');
                const content = await fsPromises.readFile(indexHtml);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            } catch (indexErr) {
                res.writeHead(500);
                res.end('Server Error: index.html not found');
            }
        } else {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
        }
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
    console.log(`📂 Serving static files from: ${DIST_DIR}`);
});
