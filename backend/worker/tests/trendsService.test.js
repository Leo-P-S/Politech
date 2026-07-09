const trendsService = require('../services/trendsService');

describe('TrendsService', () => {
  test('getTrendsForCandidate debe retornar datos de tendencias simulados', async () => {
    const result = await trendsService.getTrendsForCandidate('Candidato Test');
    expect(result).not.toBeNull();
    expect(result.keyword).toBe('Candidato Test');
    expect(result.interestOverTime).toHaveLength(2);
    expect(result.relatedQueries).toContain('Propuestas Candidato Test');
  });
});
