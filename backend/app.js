const express = require('express');
const mongoose = require('mongoose');
const { runPipelineForCandidate } = require('./worker/index');
const Candidate = require('./models/Candidate');
const Config = require('./models/Config');
const cronManager = require('./cron/cronManager');
const logger = require('./worker/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
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

// Endpoint SSE para emitir logs de scraping en vivo
app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Mantener la conexión activa enviando un comentario inicial
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

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'politech-ai-scraper',
        version: '1.0.0',
        docs: '/api/candidates'
    });
});

// Smoke test endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// --- ENDPOINTS PARA EL DASHBOARD DE PRUEBAS --- //

// Obtener todos los candidatos y sus noticias
app.get('/api/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ updatedAt: -1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear un nuevo candidato vacío (solo nombre)
app.post('/api/candidates', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
        
        // Evitar duplicados exactos (opcional pero buena práctica)
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

// Eliminar una noticia específica de un candidato
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

// Disparar el pipeline de Webscraping (SOLO SCRAPING AHORA)
app.post('/api/trigger', async (req, res) => {
    const { candidateId, startDate, endDate, mockMode, useRSS, useGdelt, useNewsApi, maxArticles } = req.body;
    
    if (!candidateId || !startDate || !endDate) {
        return res.status(400).json({ error: "Faltan parámetros requeridos (candidateId, startDate, endDate)" });
    }

    if (mockMode) {
        process.env.MOCK_MODE = 'true';
    } else {
        process.env.MOCK_MODE = 'false';
    }

    try {
        // Buscar el nombre del candidato real en la base de datos
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: "Candidato no encontrado" });

        const candidateName = candidate.nombre;

        // Ejecutamos el pipeline de scraping en segundo plano
        runPipelineForCandidate(candidateName, startDate, endDate, useRSS, useGdelt, useNewsApi, maxArticles).catch(err => {
            logger.error(`Error en pipeline de scraping en segundo plano: ${err.message}`);
        });

        res.json({ 
            status: 'started', 
            message: `Scraping iniciado para ${candidateName} en modo ${mockMode ? 'MOCK' : 'REAL'}.`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NUEVOS ENDPOINTS: IA Y CONFIGURACIÓN CRON --- //

// Endpoint para procesar manualmente noticias pendientes con IA
app.post('/api/ai/process', async (req, res) => {
    try {
        // Llamar al procesamiento general de la IA por lotes (procesa todas las noticias sin IA)
        cronManager.runAIBatchProcess().catch(err => {
            logger.error(`Error en procesamiento IA en segundo plano: ${err.message}`);
        });
        
        res.json({
            status: 'started',
            message: 'Procesamiento de Inteligencia Artificial iniciado para noticias pendientes.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener la configuración actual del cron de IA
app.get('/api/config/ai-schedule', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'global_config' });
        if (!config) {
            config = await Config.create({ key: 'global_config', cron_day: 0, cron_hour: 3 });
        }
        res.json({ day: config.cron_day, hour: config.cron_hour });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar la configuración del cron de IA
app.post('/api/config/ai-schedule', async (req, res) => {
    const { day, hour } = req.body;
    try {
        let config = await Config.findOne({ key: 'global_config' });
        if (!config) {
            config = new Config({ key: 'global_config' });
        }
        
        if (day !== undefined) config.cron_day = day;
        if (hour !== undefined) config.cron_hour = hour;
        
        await config.save();
        
        // Re-agendar el cron con los nuevos datos!
        await cronManager.scheduleAITask();
        
        res.json({ status: 'updated', message: 'Horario del resumen de IA actualizado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Manejador global de rutas no encontradas (debe ir al final)
app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Solo levanta el servidor si NO estamos corriendo pruebas con Jest
if (process.env.NODE_ENV !== 'test') {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/politech';
    mongoose.connect(mongoUri)
        .then(() => {
            console.log('Conectado a MongoDB desde Backend App');
            
            // Iniciar o agendar la tarea de cron dinámico al conectarse a BD
            cronManager.scheduleAITask();

            app.listen(PORT, () => {
                console.log(`Backend Server on port ${PORT}`);
            });
        })
        .catch(err => console.error('Error conectando a DB:', err));
}

module.exports = app;