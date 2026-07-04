const scraperService = require('../worker/services/scraperService');

async function run() {
  console.log('=== TEST: BING NEWS RSS ===');
  const bingResults = await scraperService.discoverUrlsFromDeepWeb('Keiko Fujimori', '2025-04-17', '2025-06-17', 'bing');
  console.log(`Encontrados en Bing: ${bingResults.length} resultados.`);
  if (bingResults.length > 0) {
    console.log(`Primer resultado de Bing:`, JSON.stringify(bingResults[0], null, 2));
  }

  console.log('\n=== TEST: DUCKDUCKGO (FALLBACK TO GOOGLE NEWS) ===');
  const ddgResults = await scraperService.discoverUrlsFromDeepWeb('Keiko Fujimori', '2025-04-17', '2025-06-17', 'duckduckgo');
  console.log(`Encontrados con DuckDuckGo (fallback): ${ddgResults.length} resultados.`);
  if (ddgResults.length > 0) {
    console.log(`Primer resultado (fallback):`, JSON.stringify(ddgResults[0], null, 2));
  }
}

run().catch(console.error);
