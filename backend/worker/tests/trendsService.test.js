const trendsService = require('../services/trendsService');
const logger = require('../logger');

describe('TrendsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getTrendsForCandidate debe retornar datos de tendencias simulados', async () => {
    const result = await trendsService.getTrendsForCandidate('Candidato Test');
    expect(result).not.toBeNull();
    expect(result.keyword).toBe('Candidato Test');
    expect(result.interestOverTime).toHaveLength(2);
    expect(result.relatedQueries).toContain('Propuestas Candidato Test');
  });

  test('getTrendsForCandidate debe manejar errores y retornar null', async () => {
    jest.spyOn(logger, 'info').mockImplementationOnce(() => {
      throw new Error('Forced logging error');
    });
    
    // Evitamos que imprima el error esperado en la consola
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const result = await trendsService.getTrendsForCandidate('Candidato Test');
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
