const logger = require('../logger');

class TrendsService {
  /**
   * Obtiene datos de tendencias de interés para el candidato a través de APIs públicas.
   * Esto cubre UH10 y UH12.
   */
  async getTrendsForCandidate(candidateName) {
    try {
      logger.info(`Consultando tendencias para ${candidateName}`);
      // Simulación de consumo de una API (ej. Google Trends API)
      // Como no tenemos la librería instalada aún de google-trends, simularemos una respuesta estructurada.
      return {
        keyword: candidateName,
        interestOverTime: [
          { date: '2026-03-01', value: 45 },
          { date: '2026-04-01', value: 55 },
          { date: '2026-05-01', value: 70 },
          { date: '2026-06-01', value: 85 },
          { date: '2026-07-01', value: 92 }
        ],
        relatedQueries: ['Escándalo ' + candidateName, 'Propuestas ' + candidateName, 'Elecciones 2026 ' + candidateName]
      };
    } catch (error) {
      logger.error(`Error al consultar tendencias para ${candidateName}: ${error.message}`);
      return null;
    }
  }
}

module.exports = new TrendsService();
