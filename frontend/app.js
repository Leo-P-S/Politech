const express = require('express');
const path = require('path'); // Herramienta para manejar rutas de archivos
const app = express();
const PORT = process.env.PORT || 3001; // Puerto 3001 para evitar conflictos con el backend

// Servir archivos estáticos de esta carpeta
app.use(express.static(__dirname));

// 1. EL CAMBIO PRINCIPAL: Enviar el archivo HTML del Login
app.get('/', (req, res) => {
    // Busca el archivo index.html en la carpeta actual y lo envía al navegador
    res.sendFile(path.join(__dirname, 'index.html'));
});

// NUEVO: Ruta para el dashboard de pruebas de IA/Scraping
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// 2. INTOCABLE: El Smoke Test para que tu pipeline (CI/CD) no se rompa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 3. INTOCABLE: La regla de seguridad para Jest
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Frontend Server on port ${PORT}`);
        console.log(`=> Accede al Dashboard en http://localhost:${PORT}/dashboard`);
    });
}

module.exports = app;