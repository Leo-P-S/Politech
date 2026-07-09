const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// 1. Servir los archivos estáticos de la build de Vite (SPA)
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy para redirigir /api al backend (puerto 3000)
const http = require('http');
app.use('/api', (req, res) => {
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: `/api${req.url}`,
        method: req.method,
        headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        res.status(500).json({ error: 'Fallo al conectar con el servidor backend: ' + err.message });
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