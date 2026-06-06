// 1. Cargar las variables de entorno (Siempre al inicio)
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db'); // 2. Importar la función de conexión

const app = express();
const PORT = process.env.PORT || 3000;

// 3. Ejecutar la conexión a MongoDB
connectDB();

// 4. Middleware fundamental para que tu API pueda recibir datos en formato JSON (Ej: cuando agreguen candidatos)
app.use(express.json());

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Pipeline CI/CD funcionando VIVA PERÚ',
        env: 'dev'
    });
});

// Smoke test endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Solo levanta el servidor si NO estamos corriendo pruebas con Jest
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server on port ${PORT}`);
    });
}

module.exports = app;