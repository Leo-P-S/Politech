const { startWorker, runPipelineForCandidate } = require('../index');
const scraperService = require('../services/scraperService');
const dbService = require('../services/dbService');
const mongoose = require('mongoose');

jest.mock('../services/scraperService');
jest.mock('../services/dbService');
jest.mock('mongoose');

describe('Worker Index', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('runPipelineForCandidate debe ejecutar el flujo completo de scraping y persistencia', async () => {
    const mockArticles = [
      { title: 'T1', date: '2023-01-01', source: 'S1', url: 'U1', content: 'C1' }
    ];
    scraperService.scrapeHistoricalNews.mockResolvedValueOnce(mockArticles);
    dbService.pushNewsToCandidate.mockResolvedValueOnce(true);

    await runPipelineForCandidate('Candidato Test', '2023-01-01', '2023-12-31', false, false, false, 50);

    expect(scraperService.scrapeHistoricalNews).toHaveBeenCalledWith(
      'Candidato Test', '2023-01-01', '2023-12-31', false, false, false, 50
    );
    expect(dbService.pushNewsToCandidate).toHaveBeenCalledWith(
      'Candidato Test',
      [{
        titular: 'T1',
        fecha: '2023-01-01',
        medio_prensa: 'S1',
        enlace_origen: 'U1',
        contenido_crudo: 'C1',
        procesado_por_ia: false
      }]
    );
  });

  test('runPipelineForCandidate debe abortar si no se encuentran artículos', async () => {
    scraperService.scrapeHistoricalNews.mockResolvedValueOnce([]);

    await runPipelineForCandidate('Candidato Test', '2023-01-01', '2023-12-31');

    expect(dbService.pushNewsToCandidate).not.toHaveBeenCalled();
  });

  test('runPipelineForCandidate debe capturar errores y no crashear', async () => {
    scraperService.scrapeHistoricalNews.mockRejectedValueOnce(new Error('Scraping Error'));
    
    await expect(runPipelineForCandidate('Candidato Test', '2023-01-01', '2023-12-31')).resolves.toBeUndefined();
  });

  test('startWorker debe conectarse a MongoDB si no existe conexión previa', async () => {
    mongoose.connection = { readyState: 0 };
    mongoose.connect.mockResolvedValueOnce(true);

    await startWorker();

    expect(mongoose.connect).toHaveBeenCalled();
  });

  test('startWorker no debe conectarse si ya hay una conexión activa', async () => {
    mongoose.connection = { readyState: 1 };
    mongoose.connect.mockResolvedValueOnce(true);

    await startWorker();

    expect(mongoose.connect).not.toHaveBeenCalled();
  });
});
