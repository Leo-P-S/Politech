const Candidate = require('../../models/Candidate');
const logger = require('../logger');

class DbService {
  constructor() {
    // La conexión a la base de datos debería idealmente inicializarse desde el archivo principal (index.js o app.js)
  }

  /**
   * Recibe un array de noticias procesadas por la IA y hace un $push al historial_noticias del candidato
   */
  async pushNewsToCandidate(candidateName, newsArray) {
    if (!newsArray || newsArray.length === 0) return;

    try {
      logger.info(`Guardando ${newsArray.length} noticias en la BD para ${candidateName}`);
      
      // 1. Buscamos al candidato (o lo creamos si no existe)
      let candidate = await Candidate.findOne({ nombre: candidateName });
      if (!candidate) {
        candidate = new Candidate({ nombre: candidateName, historial_noticias: [] });
      }

      // 2. Extraemos las URLs y fragmentos de texto crudo para no duplicar
      const existingUrls = new Set(candidate.historial_noticias.map(n => n.enlace_origen));
      
      const existingContents = new Set();
      candidate.historial_noticias.forEach(n => {
        if (n.contenido_crudo) {
          const contentKey = n.contenido_crudo.substring(0, 150).toLowerCase().trim();
          if (contentKey.length > 50) existingContents.add(contentKey);
        }
      });
      
      // 3. Filtramos el array entrante (Valida URL y Contenido idéntico)
      const newNews = newsArray.filter(n => {
        if (existingUrls.has(n.enlace_origen)) return false;
        
        if (n.contenido_crudo) {
            const contentKey = n.contenido_crudo.substring(0, 150).toLowerCase().trim();
            if (contentKey.length > 50 && existingContents.has(contentKey)) {
                logger.warn(`[Deduplicación de Texto] Noticia rechazada por ser copia exacta (aunque la URL es distinta): ${n.enlace_origen}`);
                return false;
            }
        }
        return true;
      });

      if (newNews.length === 0) {
        logger.info(`Las ${newsArray.length} noticias descubiertas para ${candidateName} ya existían en la BD. No se añadieron duplicados.`);
        return candidate;
      }

      // 4. Guardamos únicamente las noticias nuevas
      candidate.historial_noticias.push(...newNews);
      const result = await candidate.save();

      logger.info(`Persistencia exitosa para ${candidateName}. Se añadieron ${newNews.length} noticias nuevas. Total ahora: ${result.historial_noticias.length}`);
      return result;

    } catch (error) {
      logger.error(`Error al persistir noticias para ${candidateName} en la BD: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DbService();
