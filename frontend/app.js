const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// 1. Servir los archivos estáticos de la build de Vite (SPA)
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy para redirigir /api al backend (puerto 3000)
const http = require('http');
const https = require('https');

const backendUrlStr = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const backendUrl = new URL(backendUrlStr);
const isHttps = backendUrl.protocol === 'https:';
const httpClient = isHttps ? https : http;

app.use('/api', (req, res) => {
    const options = {
        hostname: backendUrl.hostname,
        port: backendUrl.port ? parseInt(backendUrl.port, 10) : (isHttps ? 443 : 80),
        path: `/api${req.url}`,
        method: req.method,
        headers: { ...req.headers, host: backendUrl.host }
    };

    const proxyReq = httpClient.request(options, (proxyRes) => {
        const contentType = proxyRes.headers['content-type'] || '';

        // Soporte especial para SSE (Server-Sent Events)
        if (contentType.includes('text/event-stream')) {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'  // Desactiva buffer en nginx si aplica
            });
            proxyRes.pipe(res, { end: true });

            // Cerrar si el cliente desconecta
            req.on('close', () => proxyRes.destroy());
        } else {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        }
    });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.pipe(proxyReq, { end: true });
    } else {
        proxyReq.end();
    }

    proxyReq.on('error', (err) => {
        if (!res.headersSent) {
            res.status(502).json({ error: 'Fallo al conectar con el servidor backend: ' + err.message });
        }
    });
});

// 2. Mantener las rutas antiguas por compatibilidad mientras migramos a React
app.get('/legacy-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'legacy-login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'legacy-dashboard.html'));
});

// 3. INTOCABLE: El Smoke Test para que tu pipeline (CI/CD) no se rompa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 4. Catch-all: Redirigir cualquier otra ruta a index.html para React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. INTOCABLE: La regla de seguridad para Jest
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Frontend Server on port ${PORT}`);
        console.log(`=> App principal (React): http://localhost:${PORT}`);
        console.log(`=> Dashboard (Legacy): http://localhost:${PORT}/dashboard`);
    });
}

module.exports = app;