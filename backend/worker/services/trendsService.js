const logger = require('../logger');

class TrendsService {
  /**
   * Obtiene datos de tendencias de interés para el candidato a través de APIs públicas.
   * Esto cubre UH10 y UH12.
   */
  async getTrendsForCandidate(candidateName) {
    logger.info(`Consultando tendencias para ${candidateName}`);
    try {
      // Simulación de consumo de una API (ej. Google Trends API)
      // Como no tenemos la librería instalada aún de google-trends, simularemos una respuesta estructurada.
      return {
        keyword: candidateName,
        interestOverTime: [
          { date: '2023-01-01', value: 50 },
          { date: '2023-02-01', value: 65 }
        ],
        relatedQueries: ['Escándalo ' + candidateName, 'Propuestas ' + candidateName]
      };
    } catch (error) {
      logger.error(`Error al consultar tendencias para ${candidateName}: ${error.message}`);
      return null;
    }
  }
}

module.exports = new TrendsService();
