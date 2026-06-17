// 1. Cargar las variables de entorno
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db'); // De tu rama (mantiene la arquitectura limpia)
const { runPipelineForCandidate } = require('./worker/index');
const Candidate = require('./models/Candidate'); // Usamos el modelo de Josué
const Config = require('./models/Config');
const cronManager = require('./cron/cronManager');
const logger = require('./worker/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Ejecutar la conexión a MongoDB y Cron (Solo si no estamos en pruebas)
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
    connectDB().then(() => {
        cronManager.scheduleAITask();
    }).catch(err => console.error('Error en inicialización:', err));
}

// 3. Middlewares
app.use(express.json());

// CORS personalizado simple
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

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

// Smoke test endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});


// ========================================================
// --- ENDPOINTS DE JOSUE (SCRAPING, IA Y CANDIDATE) ---
// ========================================================

// Endpoint SSE para emitir logs de scraping en vivo
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

// Obtener todos los candidatos y sus noticias
app.get('/api/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ updatedAt: -1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear un nuevo candidato vacío
app.post('/api/candidates', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
        
        // eslint-disable-next-line security/detect-non-literal-regexp
        const existe = await Candidate.findOne({ nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } });
        if (existe) return res.status(400).json({ error: "El candidato ya existe" });

        const newCandidate = await Candidate.create({ nombre, historial_noticias: [] });
        res.status(201).json(newCandidate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un candidato completo
app.delete('/api/candidates/:id', async (req, res) => {
    try {
        const result = await Candidate.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json({ message: "Candidato eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar una noticia específica
app.delete('/api/candidates/:candidateId/news/:newsId', async (req, res) => {
    try {
        const { candidateId, newsId } = req.params;
        const result = await Candidate.findByIdAndUpdate(
            candidateId,
            { $pull: { historial_noticias: { _id: newsId } } },
            { returnDocument: 'after' }
        );
        if (!result) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json({ message: "Noticia eliminada exitosamente", candidate: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disparar el pipeline de Webscraping
app.post('/api/trigger', async (req, res) => {
    const { candidateId, startDate, endDate, mockMode, useRSS, useGdelt, useNewsApi, maxArticles } = req.body;
    
    if (!candidateId || !startDate || !endDate) {
        return res.status(400).json({ error: "Faltan parámetros requeridos (candidateId, startDate, endDate)" });
    }

    process.env.MOCK_MODE = mockMode ? 'true' : 'false';

    try {
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: "Candidato no encontrado" });

        runPipelineForCandidate(candidate.nombre, startDate, endDate, useRSS, useGdelt, useNewsApi, maxArticles).catch(err => {
            logger.error(`Error en pipeline de scraping: ${err.message}`);
        });

        res.json({ status: 'started', message: `Scraping iniciado para ${candidate.nombre}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Procesar manualmente noticias con IA
app.post('/api/ai/process', async (req, res) => {
    try {
        cronManager.runAIBatchProcess().catch(err => {
            logger.error(`Error en IA: ${err.message}`);
        });
        res.json({ status: 'started', message: 'IA iniciada.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener config cron IA
app.get('/api/config/ai-schedule', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'global_config' });
        if (!config) config = await Config.create({ key: 'global_config', cron_day: 0, cron_hour: 3 });
        res.json({ day: config.cron_day, hour: config.cron_hour });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar config cron IA
app.post('/api/config/ai-schedule', async (req, res) => {
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