const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const logger = require('../logger');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
];

const RSS_FEEDS = [
  'https://rpp.pe/rss',
  'https://larepublica.pe/rss/politica.xml',
  'https://peru21.pe/rss/politica/',
  'https://elcomercio.pe/arc/outboundfeeds/rss/category/politica/?outputType=xml',
  'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
  'https://www.politico.com/rss/politicopicks.xml',
  'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/politics/rss.xml',
  'https://lannews.opennemas.com/rss/politica/',
  'https://latinamericareports.com/feed/',
  'https://news.un.org/feed/subscribe/es/news/region/americas/feed/rss.xml'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Servicio de Scraping para noticias históricas y recientes
 */
class ScraperService {
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Busca noticias recientes del candidato escaneando directamente los feeds RSS definidos.
   */
  async discoverUrlsFromFeeds(candidateName) {
    logger.info(`Escaneando feeds RSS directos para el candidato: ${candidateName}`);
    const results = [];
    const lowerCandidate = candidateName.toLowerCase();

    for (const feedUrl of RSS_FEEDS) {
      try {
        logger.info(`Consultando feed RSS: ${feedUrl}`);
        // Delay aleatorio entre 1 y 2.5 segundos para evitar bloqueos
        await sleep(Math.floor(Math.random() * 1500) + 1000);

        const response = await axios.get(feedUrl, {
          headers: { 
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'application/rss+xml, text/xml;q=0.9, */*;q=0.8'
          },
          timeout: 8000
        });

        const dom = new JSDOM(response.data, { contentType: "text/xml" });
        const doc = dom.window.document;
        const items = doc.querySelectorAll('item');

        for (let i = 0; i < items.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const item = items[i];
          const titleEl = item.querySelector('title');
          const descEl = item.querySelector('description');
          const linkEl = item.querySelector('link');

          const title = titleEl ? titleEl.textContent.trim() : '';
          const description = descEl ? descEl.textContent.trim() : '';
          const link = linkEl ? linkEl.textContent.trim() : '';

          if (!link) continue;

          // Si el nombre del candidato está en el título o descripción
          if (title.toLowerCase().includes(lowerCandidate) || description.toLowerCase().includes(lowerCandidate)) {
            // Verificar si ya lo agregamos
            if (!results.some(r => r.url === link)) {
              results.push({
                url: link,
                title: title,
                snippet: description,
                date: new Date().toISOString().split('T')[0],
                source: feedUrl
              });
              logger.info(`[Feed RSS] Coincidencia encontrada: ${title}`);
            }
          }
        }
      } catch (error) {
        logger.error(`Error procesando feed RSS ${feedUrl}: ${error.message}`);
      }
    }
    
    logger.info(`Se encontraron ${results.length} noticias recientes en los Feeds RSS directos para ${candidateName}`);
    return results;
  }

  /**
   * Obtiene la lista de URLs de noticias para un candidato usando Bing News.
   */
  async discoverUrls(candidateName) {
    logger.info(`Buscando noticias históricas en Bing News para candidato: ${candidateName}`);
    
    const results = [];
    try {
      const query = encodeURIComponent(`${candidateName} noticias politica`);
      const searchUrl = `https://www.bing.com/news/search?q=${query}&format=rss`;
      
      // Delay aleatorio antes de llamar a Bing
      await sleep(Math.floor(Math.random() * 1500) + 1000);

      const response = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/rss+xml, text/xml;q=0.9, */*;q=0.8'
        },
        timeout: 10000
      });
      
      const dom = new JSDOM(response.data, { contentType: "text/xml" });
      const doc = dom.window.document;
      const items = doc.querySelectorAll('item');
      
      for (let i = 0; i < items.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const item = items[i];
        
        const titleEl = item.querySelector('title');
        const titleText = titleEl ? titleEl.textContent.trim() : `Noticia de ${candidateName}`;
        
        const linkEl = item.querySelector('link');
        let rawHref = linkEl ? linkEl.textContent.trim() : '';
        
        let finalUrl = rawHref;
        if (rawHref.includes('&url=')) {
          const urlMatch = rawHref.match(/&url=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            finalUrl = decodeURIComponent(urlMatch[1]);
          }
        }
        
        if (!finalUrl) continue;

        const isTagOrTopic = finalUrl.includes('/tag/') || 
                             finalUrl.includes('/topics/') || 
                             finalUrl.includes('/category/');
        
        let hasLongSlug = false;
        try {
          const urlObj = new URL(finalUrl);
          const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
          hasLongSlug = pathParts.some(part => {
            const cleanPart = part.replace(/\.html?$/i, '');
            return cleanPart.split('-').length >= 3 || cleanPart.split('_').length >= 3;
          });
        } catch (e) {
          hasLongSlug = false;
        }
        
        if (isTagOrTopic || !hasLongSlug) {
           continue; 
        }

        const snippetEl = item.querySelector('description');
        const snippetText = snippetEl ? snippetEl.textContent.trim() : 'Sin resumen disponible.';

        results.push({
          url: finalUrl,
          title: titleText,
          snippet: snippetText,
          date: new Date().toISOString().split('T')[0],
          source: 'Bing News RSS'
        });

        if (results.length >= 15) break;
      }
      
      logger.info(`Se descubrieron ${results.length} URLs en Bing para ${candidateName}`);
      return results;
    } catch (error) {
      logger.error(`Error buscando URLs en Bing para ${candidateName}: ${error.message}`);
      return results;
    }
  }

  /**
   * Busca noticias en GDELT iterando en chunks de 60 días para el rango completo.
   */
  async discoverUrlsFromGdelt(candidateName, startDate, endDate, maxArticlesToFetch = 50) {
    logger.info(`Buscando noticias en GDELT para: ${candidateName} entre ${startDate} y ${endDate}`);
    const results = [];
    try {
      const formatGdeltDate = (dateObj, isEnd) => {
        const yyyy = dateObj.getUTCFullYear();
        const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getUTCDate()).padStart(2, '0');
        return isEnd ? `${yyyy}${mm}${dd}235959` : `${yyyy}${mm}${dd}000000`;
      };

      let currentStartD = new Date(startDate);
      const finalEndD = new Date(endDate);
      
      while (currentStartD <= finalEndD) {
          let chunkEndD = new Date(currentStartD.getTime() + (60 * 24 * 60 * 60 * 1000));
          if (chunkEndD > finalEndD) {
            chunkEndD = finalEndD;
          }

        const startDT = formatGdeltDate(currentStartD, false);
        const endDT = formatGdeltDate(chunkEndD, true);
        
        // Exact phrase search as per GDELT DOCS: "Donald Trump"
        const query = encodeURIComponent(`"${candidateName}"`);
        
        // Calcular cuantas nos faltan para no pedir de mas
        const remaining = maxArticlesToFetch - results.length;
        const recordsToAsk = Math.min(Math.max(remaining, 10), 250); // Mínimo 10 por si las moscas, máximo 250
        
        const searchUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=${recordsToAsk}&format=json&startdatetime=${startDT}&enddatetime=${endDT}`;

        logger.info(`GDELT Chunk: ${currentStartD.toISOString().split('T')[0]} a ${chunkEndD.toISOString().split('T')[0]} (Pidiendo max ${recordsToAsk})`);
        
        let success = false;
        let retries = 0;
        const MAX_RETRIES = 3;
        while (!success && retries < MAX_RETRIES) {
            // Backoff exponencial: 30s, 60s, 120s según el numero de retry
            const baseDelay = retries === 0 ? 30000 : retries === 1 ? 60000 : 120000;
            const jitter = Math.floor(Math.random() * 5000); // +0-5s de jitter
            const waitMs = baseDelay + jitter;
            logger.info(`GDELT: Esperando ${Math.round(waitMs / 1000)}s antes del intento ${retries + 1}/${MAX_RETRIES}...`);
            await sleep(waitMs);
            
            try {
              const response = await axios.get(searchUrl, {
                headers: { 'User-Agent': this.getRandomUserAgent() },
                timeout: 30000
              });
              
              if (response.data && response.data.articles) {
                for (const art of response.data.articles) {
                  let dateFormatted = new Date().toISOString().split('T')[0];
                  if (art.seendate && art.seendate.length >= 8) {
                    dateFormatted = art.seendate.substring(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                  }
                  if (!results.some(r => r.url === art.url)) {
                    results.push({
                      url: art.url,
                      title: art.title,
                      snippet: art.snippet || 'Sin resumen disponible en GDELT.',
                      date: dateFormatted,
                      source: art.domain || 'GDELT'
                    });
                  }
                }
                logger.info(`GDELT: Chunk exitoso, ${response.data.articles.length} artículos recibidos. Total acumulado: ${results.length}`);
              } else {
                logger.info(`GDELT: Chunk sin artículos para este periodo.`);
              }
              success = true;
            } catch(e) {
              if (e.response && e.response.status === 429) {
                 retries++;
                 if (retries < MAX_RETRIES) {
                   logger.warn(`Rate limit (429) en GDELT. Backoff exponencial: esperando ${retries === 1 ? 60 : 120}s antes del siguiente intento...`);
                 } else {
                   logger.error(`GDELT: Chunk fallido después de ${MAX_RETRIES} intentos por rate limit. Saltando chunk y continuando.`);
                 }
              } else {
                 logger.warn(`Error no-rate-limit en chunk de GDELT: ${e.message}. Saltando chunk.`);
                 break;
              }
            }
        }
        
        // Si ya tenemos suficientes noticias, rompemos el ciclo de chunks para no saturar la API
        if (results.length >= maxArticlesToFetch) {
            logger.info(`Límite de ${maxArticlesToFetch} noticias alcanzado para GDELT. Deteniendo peticiones.`);
            break;
        }
        
        currentStartD = new Date(chunkEndD.getTime() + (24 * 60 * 60 * 1000));
      }
      
      logger.info(`Se descubrieron ${results.length} URLs históricas en GDELT para ${candidateName}`);
      return results;
    } catch (error) {
      logger.error(`Error crítico buscando URLs en GDELT para ${candidateName}: ${error.message}`);
      return results;
    }
  }

  /**
   * Busca noticias recientes utilizando NewsAPI
   */
  async discoverUrlsFromNewsApi(candidateName, startDate, endDate) {
    logger.info(`Buscando noticias en NewsAPI para: ${candidateName} entre ${startDate} y ${endDate}`);
    const results = [];
    try {
      const query = encodeURIComponent(`"${candidateName}"`);
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        throw new Error("NEWS_API_KEY no está configurada en las variables de entorno.");
      }
      const searchUrl = `https://newsapi.org/v2/everything?q=${query}&from=${startDate}&to=${endDate}&sortBy=relevancy&language=es&apiKey=${apiKey}`;

      // Agregar delay solicitado para no saturar la API
      await sleep(Math.floor(Math.random() * 2000) + 2000);

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 15000
      });

      if (response.data && response.data.articles) {
        for (const art of response.data.articles) {
          if (!results.some(r => r.url === art.url)) {
            results.push({
              url: art.url,
              title: art.title || 'Sin Título',
              snippet: art.description || 'Sin resumen disponible en NewsAPI.',
              date: art.publishedAt ? art.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
              source: art.source && art.source.name ? art.source.name : 'NewsAPI'
            });
          }
        }
      }

      logger.info(`Se descubrieron un total de ${results.length} URLs en NewsAPI para ${candidateName}`);
      return results;
    } catch (error) {
      if (error.response && error.response.status === 426) {
         logger.warn(`Límite de NewsAPI alcanzado (probablemente intentando buscar más de 1 mes atrás en plan gratuito).`);
      } else if (error.response && error.response.data && error.response.data.message) {
         logger.error(`Error de NewsAPI para ${candidateName}: ${error.response.data.message}`);
      } else {
         logger.error(`Error crítico buscando URLs en NewsAPI para ${candidateName}: ${error.message}`);
      }
      return results;
    }
  }

  /**
   * Descarga el HTML bruto de una URL usando Axios
   */
  async fetchHtml(url) {
    if (process.env.MOCK_MODE === 'true') {
      return `<html><head><title>Noticia de Prueba para ${url}</title></head><body><p>El candidato propuso medidas.</p></body></html>`;
    }

    try {
      // Retardo aleatorio de 2s a 4.5s para evitar saturar el periódico (Medida anti-baneo)
      await sleep(Math.floor(Math.random() * 2500) + 2000);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent()
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      logger.error(`Error al descargar HTML de ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Limpia el HTML usando Readability y devuelve texto plano
   */
  cleanHtml(html, url) {
    if (!html) return null;
    
    try {
      const doc = new JSDOM(html, { url });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      
      if (!article) return null;
      
      return {
        title: article.title,
        textContent: article.textContent.replace(/\s+/g, ' ').trim(),
        excerpt: article.excerpt
      };
    } catch (error) {
      logger.error(`Error al limpiar HTML de ${url}: ${error.message}`);
      return null;
    }
  }

  isGarbageContent(text) {
    if (!text) return true;
    const lowerText = text.toLowerCase();
    
    // Regiones y menús concatenados por JSDOM/Readability de portales peruanos
    const garbagePatterns = [
      'edición impresa',
      'club el comercio',
      'voz universitaria',
      'vuelo de libelo',
      'piedra de toque',
      'amazonasancashapurimac',
      'ancashapurimacarequipa',
      'cajamarcacuscohuancavelica'
    ];
    
    for (const pattern of garbagePatterns) {
      if (lowerText.includes(pattern)) {
        return true;
      }
    }
    
    // Detección de acumulación de palabras clave de menús
    const menuKeywords = ['juegos', 'newsletters', 'suscripciones', 'términos y condiciones', 'politica de privacidad', 'columnistas', 'edición impresa', 'archivo histórico'];
    let matches = 0;
    for (const keyword of menuKeywords) {
      if (lowerText.includes(keyword)) {
        matches++;
      }
    }
    
    // Si contiene al menos 3 palabras de navegación típicas, se descarta por ser basura
    if (matches >= 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Flujo principal: Descubre, descarga y limpia las noticias de un candidato
   */
  async scrapeHistoricalNews(candidateName, startDate, endDate, useRSS = false, useGdelt = false, useNewsApi = false, maxArticles = 50) {
    logger.info(`Iniciando scraping para ${candidateName} (RSS: ${useRSS}, GDELT: ${useGdelt}, NewsAPI: ${useNewsApi}, Límite: ${maxArticles})`);
    
    const results = [];
    try {
      let feedArticles = [];
      let gdeltArticles = [];
      let newsApiArticles = [];

      // 1. Descubrir desde Feeds Directos (Noticias Recientes)
      if (useRSS) {
        feedArticles = await this.discoverUrlsFromFeeds(candidateName);
      }
      
      // 2. Descubrir Histórico (GDELT)
      if (useGdelt) {
        gdeltArticles = await this.discoverUrlsFromGdelt(candidateName, startDate, endDate, maxArticles);
      }

      // 3. Descubrir Histórico Reciente (NewsAPI)
      if (useNewsApi) {
        newsApiArticles = await this.discoverUrlsFromNewsApi(candidateName, startDate, endDate);
      }
      
      // Combinar eliminando duplicados por URL o por (Titular + Fuente)
      const combinedUrls = new Set();
      const combinedTitleSource = new Set();
      const discoveredArticles = [];
      
      for (const article of [...feedArticles, ...gdeltArticles, ...newsApiArticles]) {
        const titleKey = (article.title || '').toLowerCase().trim();
        const sourceKey = (article.source || '').toLowerCase().trim();
        const combinedKey = `${titleKey}|${sourceKey}`;

        // Descartar si la URL ya existe, O si el mismo medio ya aportó una noticia con ese titular exacto
        if (!combinedUrls.has(article.url) && (!titleKey || !combinedTitleSource.has(combinedKey))) {
          combinedUrls.add(article.url);
          if (titleKey) combinedTitleSource.add(combinedKey);
          discoveredArticles.push(article);
        }
      }

      // --- ALGORITMO DE INTERCALADO DE DOMINIOS (ANTI-BAN) ---
      /* eslint-disable security/detect-object-injection */
      const articlesByDomain = {};
      for (const art of discoveredArticles) {
        let domain = 'unknown';
        try {
          const urlObj = new URL(art.url);
          domain = urlObj.hostname.replace('www.', '');
        } catch (e) {
          domain = 'unknown';
        }
        if (!articlesByDomain[domain]) {
          articlesByDomain[domain] = [];
        }
        articlesByDomain[domain].push(art);
      }

      const interleavedArticles = [];
      let added = true;
      while (added) {
        added = false;
        for (const domain in articlesByDomain) {
          if (articlesByDomain[domain].length > 0) {
            interleavedArticles.push(articlesByDomain[domain].shift());
            added = true;
          }
        }
      }
      /* eslint-enable security/detect-object-injection */

      const targetCount = maxArticles; 
      
      for (const articleMeta of interleavedArticles) {
        if (results.length >= targetCount) {
          logger.info(`Se alcanzó el objetivo de ${targetCount} noticias. Deteniendo.`);
          break;
        }

        let mediaSource = 'Prensa Web';
        try {
          const urlObj = new URL(articleMeta.url);
          mediaSource = urlObj.hostname.replace('www.', '');
        } catch (e) {
          mediaSource = articleMeta.source || 'Búsqueda Web';
        }

        const html = await this.fetchHtml(articleMeta.url);
        if (html) {
          const cleanData = this.cleanHtml(html, articleMeta.url);
          if (cleanData && cleanData.textContent && cleanData.textContent.trim().length > 100 && !this.isGarbageContent(cleanData.textContent)) {
            results.push({
              url: articleMeta.url,
              date: articleMeta.date,
              source: mediaSource,
              title: cleanData.title || articleMeta.title,
              content: cleanData.textContent
            });
            logger.info(`Extracción exitosa para URL: ${articleMeta.url}`);
            continue; 
          } else if (cleanData && this.isGarbageContent(cleanData.textContent)) {
            logger.warn(`[Scraper] El contenido extraído de ${articleMeta.url} contiene demasiados elementos de navegación (basura). Se forzará el uso del fallback del snippet.`);
          }
        }

        // --- FALLBACK ROBUSTO ---
        logger.warn(`No se pudo extraer HTML limpio de ${articleMeta.url}. Usando snippet de búsqueda/feed.`);
        results.push({
          url: articleMeta.url,
          date: articleMeta.date,
          source: mediaSource,
          title: articleMeta.title || ('Noticia sobre ' + candidateName),
          content: articleMeta.snippet || 'No hay contenido disponible para esta noticia (Bloqueo de servidor de origen).'
        });
      }
    } catch (error) {
      logger.error(`Error crítico en scrapeHistoricalNews para ${candidateName}: ${error.stack}`);
    }
    
    logger.info(`Finalizado scraping para ${candidateName}. Artículos extraídos: ${results.length}`);
    return results;
  }
}

module.exports = new ScraperService();
