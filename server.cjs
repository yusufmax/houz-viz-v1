const http = require('http');
const fs = require('fs');
const path = require('path');
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
