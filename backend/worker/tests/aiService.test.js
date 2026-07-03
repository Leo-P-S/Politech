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

  beforeEach(() => {
    jest.clearAllMocks();
    const genAI = new GoogleGenerativeAI();
    const model = genAI.getGenerativeModel();
    mockGenerateContent = model.generateContent;
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

  test('processArticleBatch debe retornar un array vacio en caso de fallo de IA', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Rate Limit Exceeded'));

    const batch = [{ title: 'X', date: 'X', source: 'X', url: 'X', content: 'X' }];
    const result = await aiService.processArticleBatch(batch, 'Candidato');
    
    expect(result).toEqual([]);
  });

  test('processAllArticles debe agrupar los articulos en lotes', async () => {
    // Simularemos el procesamiento de un lote y devolveremos 2 resultados
    jest.spyOn(aiService, 'processArticleBatch').mockResolvedValue([{}, {}]);
    
    const articles = [
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }
    ];

    // Con batchSize = 5, deberia llamar a processArticleBatch 2 veces
    const result = await aiService.processAllArticles(articles, 'Candidato', 5);
    
    expect(aiService.processArticleBatch).toHaveBeenCalledTimes(2);
    // El resultado final concatena todo (2 del primer lote + 2 del segundo = 4)
    expect(result).toHaveLength(4);
  });
});
