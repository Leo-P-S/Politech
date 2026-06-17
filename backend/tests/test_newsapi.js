const scraperService = require('../worker/services/scraperService');

async function run() {
  console.log('=== TEST: NEWSAPI ===');
  // Usar fechas recientes (último mes) para que no falle con plan Developer
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  
  console.log(`Fechas: ${startDate} al ${endDate}`);
  const newsApiResults = await scraperService.discoverUrlsFromNewsApi('Keiko Fujimori', startDate, endDate);
  
  console.log(`Encontrados con NewsAPI: ${newsApiResults.length} resultados.`);
  if (newsApiResults.length > 0) {
    console.log(`Primer resultado de NewsAPI:`, JSON.stringify(newsApiResults[0], null, 2));
  }
}

run().catch(console.error);
