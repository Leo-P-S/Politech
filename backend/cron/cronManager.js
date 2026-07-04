const cron = require('node-cron');
const Config = require('../models/Config');
const Candidate = require('../models/Candidate');
const aiService = require('../worker/services/aiService');
const logger = require('../worker/logger');

class CronManager {
  constructor() {
    this.activeTask = null;
  }

  /**
   * Lee la base de datos y agenda la tarea de IA.
   * Destruye la tarea previa si ya existe.
   */
  async scheduleAITask() {
    try {
      let config = await Config.findOne({ key: 'global_config' });
      
      // Si no existe, creamos una por defecto (Domingo a las 3 AM)
      if (!config) {
        config = await Config.create({ key: 'global_config', cron_day: 0, cron_hour: 3 });
      }

      // Detener tarea anterior si existe
      if (this.activeTask) {
        this.activeTask.stop();
        logger.info('Tarea de cron anterior detenida.');
      }

      // Formato cron: MIN HORA DIA_MES MES DIA_SEMANA
      const cronExpression = `0 ${config.cron_hour} * * ${config.cron_day}`;
      logger.info(`Agendando procesamiento de IA con expresión cron: ${cronExpression}`);

      this.activeTask = cron.schedule(cronExpression, async () => {
        logger.info('Ejecutando tarea programada: Procesamiento de IA en lote');
        await this.runAIBatchProcess();
      });

    } catch (error) {
      logger.error('Error al agendar la tarea de cron:', error);
    }
  }

  /**
   * Busca todas las noticias no procesadas en la BD y las pasa por la IA
   */
  async runAIBatchProcess() {
    try {
      const candidates = await Candidate.find({});
      let totalProcessed = 0;

      for (let candidate of candidates) {
        const unprocessedNews = candidate.historial_noticias.filter(n => !n.procesado_por_ia);

        if (unprocessedNews.length > 0) {
          logger.info(`Procesando ${unprocessedNews.length} noticias pendientes para ${candidate.nombre}...`);

          // 1. Mapeamos TODAS las noticias crudas a un solo array
          const rawArticles = unprocessedNews.map(news => ({
            title: news.titular,
            date: news.fecha,
            source: news.medio_prensa,
            url: news.enlace_origen,
            content: news.contenido_crudo
          }));

          // 2. Enviamos el array completo (aiService se encargará de cortarlo de 5 en 5)
          const processedArr = await aiService.processAllArticles(rawArticles, candidate.nombre);

          // 3. Emparejamos los resultados de Gemini con la base de datos usando la URL
          if (processedArr && processedArr.length > 0) {
            for (let result of processedArr) {
              const dbNews = candidate.historial_noticias.find(n => n.enlace_origen === result.enlace_origen);
              if (dbNews) {
                dbNews.analisis_ia = {
                  resumen_noticia: result.resumen_noticia,
                  categoria: result.categoria,
                  sentimiento: result.sentimiento,
                  sesgo_politico: result.sesgo_politico,
                  entidades_clave: result.entidades_clave
                };
                dbNews.procesado_por_ia = true;
                totalProcessed++;
              }
            }
            await candidate.save();
          }
        }
      }
      logger.info(`Lote completado. Total de noticias procesadas por IA: ${totalProcessed}`);
    } catch (error) {
      logger.error('Error durante el procesamiento por lotes de IA:', error);
    }
  }
}

module.exports = new CronManager();
