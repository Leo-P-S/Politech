const axios = require('axios');
const scraperService = require('../services/scraperService');

// Mockear Axios
jest.mock('axios');

// Mockear jsdom y readability para evitar problemas de ESM en Jest
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: { document: {} }
  }))
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: jest.fn(() => ({
      title: 'Título Original',
      textContent: ' Noticia Importante Este es el contenido principal de la noticia. Contiene mucha información relevante sobre el candidato y sus propuestas políticas para las próximas elecciones presidenciales del año 2026. ',
      excerpt: 'Excerpt'
    }))
  }))
}));

describe('Scraper Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchHtml debe retornar el HTML en una petición exitosa', async () => {
    const fakeHtml = '<html><body><h1>Test</h1></body></html>';
    axios.get.mockResolvedValueOnce({ data: fakeHtml });

    const result = await scraperService.fetchHtml('https://example.com');
    expect(result).toBe(fakeHtml);
    expect(axios.get).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  test('fetchHtml debe manejar errores y retornar null (RNF08 - Tolerancia a fallos)', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await scraperService.fetchHtml('https://failing-site.com');
    expect(result).toBeNull();
  });

  test('cleanHtml debe extraer el texto correctamente usando Readability (mockeado)', () => {
    const result = scraperService.cleanHtml('<html></html>', 'https://example.com');
    expect(result).not.toBeNull();
    expect(result.title).toBe('Título Original');
    expect(result.textContent).toBe('Noticia Importante Este es el contenido principal de la noticia. Contiene mucha información relevante sobre el candidato y sus propuestas políticas para las próximas elecciones presidenciales del año 2026.');
  });

  test('scrapeHistoricalNews debe procesar la lista y devolver artículos limpios', async () => {
    // El método correcto que usa scrapeHistoricalNews cuando useRSS=true es discoverUrlsFromFeeds
    jest.spyOn(scraperService, 'discoverUrlsFromFeeds').mockResolvedValueOnce([
      { url: 'https://test.com/1', title: 'Título Original', date: '2023-01-01', source: 'Test', snippet: 'snippet' }
    ]);

    // fetchHtml devuelve HTML falso para que cleanHtml (mockeado) lo procese
    axios.get.mockResolvedValueOnce({ data: '<html><body>contenido</body></html>' });

    // useRSS=true para que scrapeHistoricalNews llame a discoverUrlsFromFeeds
    const results = await scraperService.scrapeHistoricalNews('Candidato Test', '2023-01-01', '2023-12-31', true);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Título Original');
    expect(results[0].url).toBe('https://test.com/1');
  });
});
