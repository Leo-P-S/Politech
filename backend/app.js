// 1. Cargar las variables de entorno
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const securityMiddleware = require('./middleware/security');
const { runPipelineForCandidate } = require('./worker/index');
const Candidato = require('./models/Candidato');
const Config = require('./models/Config');
const cronManager = require('./cron/cronManager');
const logger = require('./worker/logger');
const authMiddleware = require('./middlewares/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Ejecutar la conexión a MongoDB y Cron (Solo si no estamos en pruebas)
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
    connectDB().then(async () => {
        await Candidato.updateMany({}, {
            $pull: {
                equipoTrabajo: {
                    nombre: { $in: ['Carlos Mendoza', 'Ana María Torres', 'Ana Maria Torres'] }
                }
            }
        });
        cronManager.scheduleAITask();
    }).catch(err => console.error('Error en inicialización:', err));
}

// 3. Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(securityMiddleware);



// Importar rutas
const authRoutes = require('./routes/auth.routes');
const candidatoRoutes = require('./routes/candidato.routes');
const electorRoutes = require('./routes/elector.routes');

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/candidatos', candidatoRoutes);
app.use('/api/candidates', candidatoRoutes); // Alias para compatibilidad con frontend
app.use('/api/elector', electorRoutes);

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Pipeline CI/CD funcionando VIVA PERÚ',
        service: 'politech-ai-scraper',
        version: '1.0.0',
        docs: '/api/candidates',
        env: 'dev'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// ========================================================
// --- ENDPOINTS DE JOSUE (SCRAPING, IA Y CANDIDATE) ---
// ========================================================

// Endpoint SSE para emitir logs de scraping en vivo (abierto para monitorización en dev o se puede asegurar)
app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(': connected\n\n');

    const logListener = (info) => {
        res.write(`data: ${JSON.stringify(info)}\n\n`);
    };

    logger.logEmitter.on('log', logListener);

    req.on('close', () => {
        logger.logEmitter.removeListener('log', logListener);
        res.end();
    });
});

// Disparar el pipeline de Webscraping (PROTEGIDO)
app.post('/api/trigger', authMiddleware, async (req, res) => {
    const { candidateId, startDate, endDate, mockMode, useRSS, useGdelt, useNewsApi, maxArticles } = req.body;
    
    // Validar rol administrativo
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere cuenta de administrador.' });
    }
    
    if (!candidateId || !startDate || !endDate) {
        return res.status(400).json({ error: "Faltan parámetros requeridos (candidateId, startDate, endDate)" });
    }
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return res.status(400).json({ error: "candidateId inválido" });
    }

    process.env.MOCK_MODE = mockMode ? 'true' : 'false';

    try {
        const candidate = await Candidato.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: "Candidato no encontrado" });

        runPipelineForCandidate(candidate.nombre, startDate, endDate, useRSS, useGdelt, useNewsApi, maxArticles).catch(err => {
            logger.error(`Error en pipeline de scraping: ${err.message}`);
        });

        res.json({ status: 'started', message: `Scraping iniciado para ${candidate.nombre}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Procesar manualmente noticias con IA (PROTEGIDO)
app.post('/api/ai/process', authMiddleware, async (req, res) => {
    // Validar rol administrativo
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere cuenta de administrador.' });
    }

    const { candidateId, mockMode, reprocessAll } = req.body;
    if (!candidateId) {
        return res.status(400).json({ error: 'Debes seleccionar un candidato.' });
    }
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return res.status(400).json({ error: 'candidateId inválido' });
    }

    process.env.MOCK_MODE = mockMode ? 'true' : 'false';

    try {
        cronManager.runAIBatchProcess({ forceRefresh: true, candidateId, reprocessAll: !!reprocessAll }).catch(err => {
            logger.error(`Error en IA: ${err.message}`);
        });
        res.json({ status: 'started', message: 'IA iniciada para el candidato seleccionado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener config cron IA (PROTEGIDO)
app.get('/api/config/ai-schedule', authMiddleware, async (req, res) => {
    // Validar rol administrativo
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere cuenta de administrador.' });
    }

    try {
        let config = await Config.findOne({ key: 'global_config' });
        if (!config) config = await Config.create({ key: 'global_config', cron_day: 0, cron_hour: 3 });
        res.json({ day: config.cron_day, hour: config.cron_hour });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar config cron IA (PROTEGIDO)
app.post('/api/config/ai-schedule', authMiddleware, async (req, res) => {
    // Validar rol administrativo
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere cuenta de administrador.' });
    }

    const { day, hour } = req.body;
    try {
        let config = await Config.findOne({ key: 'global_config' }) || new Config({ key: 'global_config' });
        if (day !== undefined) config.cron_day = day;
        if (hour !== undefined) config.cron_hour = hour;
        await config.save();
        await cronManager.scheduleAITask();
        res.json({ status: 'updated', message: 'Horario IA actualizado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manejador global de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// 4. Levantar el servidor
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server on port ${PORT}`);
    });
}

module.exports = app;
