require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./logger');

// Servicios
const scraperService = require('./services/scraperService');
const dbService = require('./services/dbService');

/**
 * Función que orquesta la recolección de noticias (Scraping)
 * Extrae las noticias de la web y las guarda en estado "Crudo" en la BD.
 * Ya no llama a la IA directamente.
 */
async function runPipelineForCandidate(candidateName, startDate, endDate, useRSS = false, useGdelt = false, useNewsApi = false, maxArticles = 50) {
  try {
    const startTime = Date.now();
    logger.info(`=== INICIANDO SCRAPING PARA ${candidateName} ===`);

    // 1. Scraping (Descubrimiento y Limpieza)
    const rawArticles = await scraperService.scrapeHistoricalNews(candidateName, startDate, endDate, useRSS, useGdelt, useNewsApi, maxArticles);
    if (!rawArticles || rawArticles.length === 0) {
      logger.warn(`No se encontraron artículos para ${candidateName}. Abortando pipeline de scraping.`);
      return;
    }

    // 2. Formatear para BD (Solo texto crudo, procesado_por_ia en false por defecto)
    const dbReadyNews = rawArticles.map(article => ({
      titular: article.title || 'Sin Título',
      fecha: article.date,
      medio_prensa: article.source,
      enlace_origen: article.url,
      contenido_crudo: article.content, // Guardamos el texto bruto
      procesado_por_ia: false // Importante: marcamos que aún falta IA
    }));

    // 3. Persistencia en DB
    await dbService.pushNewsToCandidate(candidateName, dbReadyNews);

    const endTime = Date.now();
    const durationMin = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    logger.info(`=== SCRAPING COMPLETADO PARA ${candidateName} EN ${durationMin} MINUTOS ===`);
  } catch (error) {
    logger.error(`Error no controlado en el scraping para ${candidateName}: ${error.message}`);
  }
}

/**
 * Inicialización del Worker
 */
async function startWorker() {
  logger.info('Iniciando Worker/Pipeline de Scraping');

  // Conexión a MongoDB (Solo si se ejecuta independiente, sino app.js maneja esto)
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/politech';
    try {
      await mongoose.connect(mongoUri);
      logger.info('Conectado a MongoDB Exitosamente desde Worker');
    } catch (dbError) {
      logger.error(`Fallo crítico al conectar a MongoDB: ${dbError.message}`);
    }
  }

  // Ya no usamos el cron duro aquí. cronManager.js se encarga de eso.
}

// Si este archivo es el principal, lo ejecutamos
if (require.main === module) {
  startWorker();
}

module.exports = {
  startWorker,
  runPipelineForCandidate
};
