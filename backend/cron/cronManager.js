const cron = require('node-cron');
const Config = require('../models/Config');
const Candidato = require('../models/Candidato');
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
      const candidates = await Candidato.find({});
      let totalProcessed = 0;

      for (let candidate of candidates) {
        // Filtramos las noticias que aún no han sido procesadas
        const unprocessedNews = candidate.historial_noticias.filter(n => !n.procesado_por_ia);
        let hasChanges = false;
        
        if (unprocessedNews.length > 0) {
          logger.info(`Procesando ${unprocessedNews.length} noticias pendientes para ${candidate.nombre}...`);
          
          const newsToProcess = unprocessedNews.filter(news => news.contenido_crudo);
          const rawArticles = newsToProcess.map(news => ({
            title: news.titular,
            content: news.contenido_crudo,
            date: news.fecha,
            source: news.medio_prensa,
            url: news.enlace_origen
          }));

          if (rawArticles.length > 0) {
            // Llamada a la IA procesando por lotes (batching) internamente
            const processedArr = await aiService.processAllArticles(rawArticles, candidate.nombre);
            
            if (processedArr && processedArr.length > 0) {
              processedArr.forEach((result, idx) => {
                // Buscar coincidencia por enlace_origen, y si no, por titular
                let matchedNews = newsToProcess.find(n => n.enlace_origen === result.enlace_origen);
                if (!matchedNews) {
                  matchedNews = newsToProcess.find(n => n.titular && result.titular && n.titular.toLowerCase().trim() === result.titular.toLowerCase().trim());
                }
                // Fallback por índice si la cantidad coincide
                if (!matchedNews && processedArr.length === rawArticles.length) {
                  matchedNews = newsToProcess[idx];
                }

                if (matchedNews) {
                  matchedNews.analisis_ia = {
                    resumen_noticia: result.resumen_noticia,
                    categoria: result.categoria,
                    sentimiento: result.sentimiento,
                    sesgo_politico: result.sesgo_politico,
                    entidades_clave: result.entidades_clave
                  };
                  matchedNews.procesado_por_ia = true;
                  totalProcessed++;
                  hasChanges = true;
                }
              });
            }
          }
        }

        // Si se procesaron nuevas noticias, o si el candidato tiene noticias pero no tiene resumen global generado
        const allProcessedNews = candidate.historial_noticias.filter(n => n.procesado_por_ia);
        if (allProcessedNews.length > 0 && (hasChanges || !candidate.resumenIA)) {
          logger.info(`Generando resumen global (resumenIA) para ${candidate.nombre}...`);
          const resumenGlobal = await aiService.generateCandidateSummary(allProcessedNews, candidate.nombre);
          candidate.resumenIA = resumenGlobal;
          hasChanges = true;
        }

        if (hasChanges) {
          // Guardamos los cambios en el candidato
          await candidate.save();
        }
      }

      logger.info(`Lote completado. Total de noticias procesadas por IA: ${totalProcessed}`);

    } catch (error) {
      logger.error('Error durante el procesamiento por lotes de IA:', error);
    }
  }
}

module.exports = new CronManager();
