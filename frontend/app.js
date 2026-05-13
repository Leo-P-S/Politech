const express = require('express');
const path = require('path'); // Herramienta para manejar rutas de archivos
const app = express();
const PORT = process.env.PORT || 3000;

// 1. EL CAMBIO PRINCIPAL: Enviar el archivo HTML
app.get('/', (req, res) => {
    // Busca el archivo index.html en la carpeta actual y lo envía al navegador
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. INTOCABLE: El Smoke Test para que tu pipeline (CI/CD) no se rompa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 3. INTOCABLE: La regla de seguridad para Jest
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Frontend Server on port ${PORT}`);
    });
}

module.exports = app;