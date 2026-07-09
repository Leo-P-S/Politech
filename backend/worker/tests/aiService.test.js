const aiService = require('../services/aiService');

// Mockear el SDK de Google Generative AI
jest.mock('@google/generative-ai', () => {
  const mGenerateContent = jest.fn();
  const mModel = { generateContent: mGenerateContent };
  const mGenerativeAI = jest.fn().mockImplementation(() => {
    return { getGenerativeModel: jest.fn(() => mModel) };
  });
  return { GoogleGenerativeAI: mGenerativeAI };
});

const { GoogleGenerativeAI } = require('@google/generative-ai');

describe('AI Service', () => {
  let mockGenerateContent;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    const genAI = new GoogleGenerativeAI();
    const model = genAI.getGenerativeModel();
    mockGenerateContent = model.generateContent;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('processArticleBatch debe parsear correctamente la respuesta JSON de Gemini', async () => {
    const fakeResponse = `
    [
      {
        "titular": "Noticia 1",
        "fecha": "2023-01-01",
        "medio_prensa": "Test News",
        "enlace_origen": "https://test.com",
        "resumen_noticia": "Resumen de prueba",
        "categoria": "Campaña"
      }
    ]`;

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => fakeResponse }
    });

    const batch = [{
      title: 'Noticia 1',
      date: '2023-01-01',
      source: 'Test News',
      url: 'https://test.com',
      content: 'Contenido extenso...'
    }];

    const result = await aiService.processArticleBatch(batch, 'Candidato Falso');
    
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('Campaña');
    expect(result[0].resumen_noticia).toBe('Resumen de prueba');
  });

  test('processArticleBatch en MOCK_MODE debe retornar un JSON falso de inmediato', async () => {
    process.env.MOCK_MODE = 'true';
    const batch = [{
      title: 'Noticia 1',
      date: '2023-01-01',
      source: 'Test News',
      url: 'https://test.com',
      content: 'Contenido extenso...'
    }];

    const result = await aiService.processArticleBatch(batch, 'Candidato Falso');
    
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('Economía');
    expect(result[0].titular).toBe('Noticia 1');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('processArticleBatch debe retornar un array vacio en caso de fallo de IA', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Rate Limit Exceeded'));

    const batch = [{ title: 'X', date: 'X', source: 'X', url: 'X', content: 'X' }];
    const result = await aiService.processArticleBatch(batch, 'Candidato');
    
    expect(result).toEqual([]);
  });

  test('processAllArticles debe agrupar los articulos en lotes', async () => {
    jest.spyOn(aiService, 'processArticleBatch').mockResolvedValue([{}, {}]);
    
    const articles = [
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }
    ];

    const result = await aiService.processAllArticles(articles, 'Candidato', 5);
    
    expect(aiService.processArticleBatch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(4);
  });

  test('generateCandidateSummary debe retornar mensaje de falta de info si no hay noticias', async () => {
    const res1 = await aiService.generateCandidateSummary([], 'Candidato');
    const res2 = await aiService.generateCandidateSummary(null, 'Candidato');
    
    expect(res1).toBe("Actualmente no hay suficiente información para generar una síntesis automática para este candidato.");
    expect(res2).toBe("Actualmente no hay suficiente información para generar una síntesis automática para este candidato.");
  });

  test('generateCandidateSummary en MOCK_MODE debe retornar resumen falso', async () => {
    process.env.MOCK_MODE = 'true';
    const result = await aiService.generateCandidateSummary([{ titular: 'Noticia 1' }], 'Keiko Fujimori');
    expect(result).toContain('Keiko Fujimori es una política peruana');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('generateCandidateSummary normal debe llamar a generateContent y retornar respuesta', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '  Resumen generado de prueba.  ' }
    });

    const newsList = [
      {
        titular: 'Noticia 1',
        analisis_ia: {
          resumen_noticia: 'Resumen 1',
          sesgo_politico: 'Informativo',
          sentimiento: 'Neutral'
        }
      }
    ];

    const result = await aiService.generateCandidateSummary(newsList, 'Candidato Falso');
    expect(result).toBe('Resumen generado de prueba.');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  test('generateCandidateSummary debe manejar errores y retornar mensaje por defecto', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini Down'));

    const newsList = [{ titular: 'Noticia 1' }];
    const result = await aiService.generateCandidateSummary(newsList, 'Candidato Falso');
    expect(result).toBe('Error al generar la síntesis automática.');
  });
});
