const cronManager = require('../cron/cronManager');
const Config = require('../models/Config');
const Candidato = require('../models/Candidato');
const aiService = require('../worker/services/aiService');
const cron = require('node-cron');

jest.mock('../models/Config');
jest.mock('../models/Candidato');
jest.mock('../worker/services/aiService');
jest.mock('node-cron');

describe('CronManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cronManager.activeTask = null;
  });

  test('scheduleAITask debe crear una configuración por defecto si no existe y agendar la tarea', async () => {
    Config.findOne.mockResolvedValueOnce(null);
    Config.create.mockResolvedValueOnce({
      cron_day: 0,
      cron_hour: 3
    });

    const mockTask = { stop: jest.fn() };
    cron.schedule.mockReturnValueOnce(mockTask);

    await cronManager.scheduleAITask();

    expect(Config.findOne).toHaveBeenCalled();
    expect(Config.create).toHaveBeenCalledWith({ key: 'global_config', cron_day: 0, cron_hour: 3 });
    expect(cron.schedule).toHaveBeenCalledWith('0 3 * * 0', expect.any(Function));
    expect(cronManager.activeTask).toBe(mockTask);
  });

  test('scheduleAITask debe detener la tarea anterior si ya existía una activa', async () => {
    const mockOldTask = { stop: jest.fn() };
    cronManager.activeTask = mockOldTask;

    Config.findOne.mockResolvedValueOnce({
      cron_day: 1,
      cron_hour: 5
    });

    const mockNewTask = { stop: jest.fn() };
    cron.schedule.mockReturnValueOnce(mockNewTask);

    await cronManager.scheduleAITask();

    expect(mockOldTask.stop).toHaveBeenCalled();
    expect(cron.schedule).toHaveBeenCalledWith('0 5 * * 1', expect.any(Function));
    expect(cronManager.activeTask).toBe(mockNewTask);
  });

  test('runAIBatchProcess debe procesar todas las noticias pendientes de todos los candidatos', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockCandidato = {
      nombre: 'Candidato Test',
      historial_noticias: [
        {
          titular: 'N1',
          contenido_crudo: 'Contenido 1',
          procesado_por_ia: false,
          analisis_ia: null
        },
        {
          titular: 'N2',
          contenido_crudo: null, // Debe ser ignorado por no tener contenido crudo
          procesado_por_ia: false,
          analisis_ia: null
        },
        {
          titular: 'N3',
          contenido_crudo: 'Contenido 3',
          procesado_por_ia: true, // Debe ser ignorado por estar ya procesado
          analisis_ia: {}
        }
      ],
      save: mockSave
    };

    Candidato.find.mockResolvedValueOnce([mockCandidato]);
    aiService.processAllArticles.mockResolvedValueOnce([{
      resumen_noticia: 'Resumen 1',
      categoria: 'Categoria 1',
      sentimiento: 'Sentimiento 1',
      sesgo_politico: 'Sesgo 1',
      entidades_clave: ['Entidad 1']
    }]);

    await cronManager.runAIBatchProcess();

    expect(Candidato.find).toHaveBeenCalled();
    expect(aiService.processAllArticles).toHaveBeenCalledWith(
      [{ title: 'N1', content: 'Contenido 1' }],
      'Candidato Test'
    );
    expect(mockCandidato.historial_noticias[0].procesado_por_ia).toBe(true);
    expect(mockCandidato.historial_noticias[0].analisis_ia).toEqual({
      resumen_noticia: 'Resumen 1',
      categoria: 'Categoria 1',
      sentimiento: 'Sentimiento 1',
      sesgo_politico: 'Sesgo 1',
      entidades_clave: ['Entidad 1']
    });
    expect(mockSave).toHaveBeenCalled();
  });

  test('runAIBatchProcess debe manejar errores de BD', async () => {
    Candidato.find.mockRejectedValueOnce(new Error('DB Error'));
    // No debe lanzar error pero debe atraparlo internamente e imprimirlo
    await expect(cronManager.runAIBatchProcess()).resolves.toBeUndefined();
  });
});
