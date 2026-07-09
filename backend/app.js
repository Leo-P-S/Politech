require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const securityMiddleware = require('./middleware/security');
const candidateRoutes = require('./routes/candidate.routes');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

app.use(express.json());
app.use(securityMiddleware);

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Pipeline CI/CD funcionando VIVA PERÚ',
        env: 'dev'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.use('/api/candidates', candidateRoutes);

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server on port ${PORT}`);
    });
}

module.exports = app;