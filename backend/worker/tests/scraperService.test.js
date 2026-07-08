const axios = require('axios');
const scraperService = require('../services/scraperService');

jest.mock('axios');

jest.mock('jsdom', () => {
  return {
    JSDOM: jest.fn().mockImplementation((content) => {
      return {
        window: {
          document: {
            querySelectorAll: (selector) => {
              if (selector === 'item') {
                if (content && content.includes('candidato-test-elecciones.html')) {
                  return [{
                    querySelector: (subSelector) => {
                      if (subSelector === 'title') return { textContent: 'Noticia de Candidato Test' };
                      if (subSelector === 'link') return { textContent: 'https://bing.com/news?q=test&url=https%3A%2F%2Fperu21.pe%2Fpolitica%2Fcandidato-test-elecciones.html' };
                      if (subSelector === 'description') return { textContent: 'Detalles' };
                      return null;
                    }
                  }];
                }
                if (content && content.includes('https://rpp.pe/1')) {
                  return [{
                    querySelector: (subSelector) => {
                      if (subSelector === 'title') return { textContent: 'Candidato Test en campaña' };
                      if (subSelector === 'link') return { textContent: 'https://rpp.pe/1' };
                      if (subSelector === 'description') return { textContent: 'Candidato Test detalla' };
                      return null;
                    }
                  }];
                }
              }
              return [];
            }
          }
        }
      };
    })
  };
});

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
  let setTimeoutSpy;

  beforeAll(() => {
    // Evitar demoras de sleep ejecutando los callbacks de setTimeout inmediatamente
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 1;
    });
  });

  afterAll(() => {
    setTimeoutSpy.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchHtml debe retornar el HTML en una petición exitosa', async () => {
    const fakeHtml = '<html><body><h1>Test</h1></body></html>';
    axios.get.mockResolvedValueOnce({ data: fakeHtml });

    const result = await scraperService.fetchHtml('https://example.com');
    expect(result).toBe(fakeHtml);
  });

  test('fetchHtml debe manejar errores y retornar null', async () => {
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

  test('cleanHtml debe manejar errores y retornar null', () => {
    const result = scraperService.cleanHtml(null, 'https://example.com');
    expect(result).toBeNull();
  });

  test('isGarbageContent debe identificar contenido basura', () => {
    expect(scraperService.isGarbageContent('club el comercio y edición impresa')).toBe(true);
    expect(scraperService.isGarbageContent('juegos newsletters suscripciones columnistas')).toBe(true);
    expect(scraperService.isGarbageContent('El candidato dio un discurso y presentó propuestas')).toBe(false);
  });

  test('discoverUrlsFromFeeds debe descubrir URLs de RSS feeds si coinciden con el nombre', async () => {
    const fakeXml = `
      <rss>
        <channel>
          <item>
            <title>Candidato Test en campaña</title>
            <description>Candidato Test detalla su plan</description>
            <link>https://rpp.pe/1</link>
          </item>
        </channel>
      </rss>
    `;
    // Usamos mockResolvedValue para todas las llamadas en el bucle
    axios.get.mockResolvedValue({ data: fakeXml });

    const results = await scraperService.discoverUrlsFromFeeds('Candidato Test');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].url).toBe('https://rpp.pe/1');
  });

  test('discoverUrls debe descubrir URLs desde Bing News RSS', async () => {
    const fakeXml = `
      <rss>
        <channel>
          <item>
            <title>Noticia de Candidato Test</title>
            <link>https://bing.com/news?q=test&amp;url=https%3A%2F%2Fperu21.pe%2Fpolitica%2Fcandidato-test-elecciones.html</link>
            <description>Detalles de la noticia</description>
          </item>
        </channel>
      </rss>
    `;
    axios.get.mockResolvedValueOnce({ data: fakeXml });

    const results = await scraperService.discoverUrls('Candidato Test');
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('https://peru21.pe/politica/candidato-test-elecciones.html');
  });

  test('discoverUrlsFromGdelt debe retornar artículos utilizando la API de GDELT', async () => {
    const fakeData = {
      articles: [
        {
          url: 'https://elcomercio.pe/politica/1',
          title: 'Noticia GDELT',
          seendate: '20230510T120000Z',
          domain: 'elcomercio.pe',
          snippet: 'Snippet GDELT'
        }
      ]
    };
    axios.get.mockResolvedValue({ data: fakeData });

    const results = await scraperService.discoverUrlsFromGdelt('Candidato GDELT', '2023-05-01', '2023-05-15', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].url).toBe('https://elcomercio.pe/politica/1');
  });

  test('discoverUrlsFromNewsApi debe retornar artículos usando NewsAPI', async () => {
    process.env.NEWS_API_KEY = 'mock_key';
    const fakeData = {
      articles: [
        {
          url: 'https://larepublica.pe/politica/1',
          title: 'Noticia NewsAPI',
          publishedAt: '2023-06-20T10:00:00Z',
          source: { name: 'La Republica' },
          description: 'Snippet NewsAPI'
        }
      ]
    };
    axios.get.mockResolvedValueOnce({ data: fakeData });

    const results = await scraperService.discoverUrlsFromNewsApi('Candidato NewsAPI', '2023-06-01', '2023-06-30');
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('https://larepublica.pe/politica/1');
  });

  test('scrapeHistoricalNews debe intercalar dominios y usar fallback si falla la extracción del HTML', async () => {
    jest.spyOn(scraperService, 'discoverUrlsFromFeeds').mockResolvedValueOnce([
      { url: 'https://sourceA.com/news-candidato-test', title: 'T1', date: '2023-01-01', source: 'SourceA', snippet: 'Snippet 1' },
      { url: 'https://sourceA.com/news2-candidato-test', title: 'T2', date: '2023-01-02', source: 'SourceA', snippet: 'Snippet 2' }
    ]);
    jest.spyOn(scraperService, 'discoverUrlsFromGdelt').mockResolvedValueOnce([
      { url: 'https://sourceB.com/news-candidato-test', title: 'T3', date: '2023-01-03', source: 'SourceB', snippet: 'Snippet 3' }
    ]);

    // Simular que fetchHtml falla para gatillar el fallback
    jest.spyOn(scraperService, 'fetchHtml').mockResolvedValue(null);

    const results = await scraperService.scrapeHistoricalNews('Candidato Test', '2023-01-01', '2023-01-10', true, true, false, 5);

    expect(results.length).toBe(3);
    // Verificar que se haya intercalado dominios
    expect(results[0].url).toBe('https://sourceA.com/news-candidato-test');
    expect(results[1].url).toBe('https://sourceB.com/news-candidato-test');
    expect(results[2].url).toBe('https://sourceA.com/news2-candidato-test');
  });
});
