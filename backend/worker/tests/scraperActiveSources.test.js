const scraperService = require('../services/scraperService');

describe('ScraperService - discoverActiveSources', () => {
  test('debe descubrir y retornar fuentes adicionales de propuestas, antecedentes y JNE deduplicadas', async () => {
    const discoverSpy = jest.spyOn(scraperService, 'discoverUrls')
      .mockResolvedValueOnce([{ url: 'https://jne.pe/1', title: 'JNE', snippet: 'Hoja de vida presentada', source: 'JNE' }])
      .mockResolvedValueOnce([{ url: 'https://jne.pe/1', title: 'JNE Duplicado', snippet: 'Hoja de vida presentada', source: 'JNE' }])
      .mockResolvedValueOnce([]);
    
    const fetchSpy = jest.spyOn(scraperService, 'fetchHtml').mockResolvedValue('<html></html>');
    const cleanSpy = jest.spyOn(scraperService, 'cleanHtml').mockReturnValue({
      title: 'Hoja de Vida',
      textContent: 'El candidato declaró ingresos por 100,000 soles ante el JNE.'
    });

    const results = await scraperService.discoverActiveSources('Candidato de Prueba', 5);

    expect(results).toHaveLength(1);
    expect(results[0].enlace_origen).toBe('https://jne.pe/1');
    expect(results[0].contenido_crudo).toContain('JNE');

    discoverSpy.mockRestore();
    fetchSpy.mockRestore();
    cleanSpy.mockRestore();
  });
});
