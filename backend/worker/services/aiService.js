const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../logger');

// Función de retardo para manejar los límites de peticiones (Rate Limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AIService {
  constructor() {
    // Inicializar Gemini con la API key de entorno
    const apiKey = process.env.GEMINI_API_KEY || 'dummy_key_for_testing';
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Usamos el modelo recomendado para procesamiento general de texto
    // MEJORA: Forzamos el responseMimeType a JSON para evitar que Gemini envíe Markdown
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
  }

  /**
   * Analiza un lote de noticias para extraer resumen, palabras clave y categoría.
   * Espera un JSON en un formato estricto.
   */
  async processArticleBatch(batch, candidateName) {
    if (!batch || batch.length === 0) return [];

    logger.info(`Procesando lote de ${batch.length} noticias para ${candidateName} mediante IA`);

    if (process.env.MOCK_MODE === 'true') {
      logger.info(`[MOCK MODE] Retornando JSON falso para el lote de noticias`);
      return batch.map(art => ({
        titular: art.title,
        fecha: art.date,
        medio_prensa: art.source,
        enlace_origen: art.url,
        resumen_noticia: "Este es un resumen generado de prueba. Discute políticas económicas y posibles alianzas.",
        categoria: "Economía",
        sentimiento: "Neutral",
        sesgo_politico: "Informativo",
        entidades_clave: ["Ministerio de Economía", "Banco Central"]
      }));
    }

    // Preparamos el payload en texto claro para que el modelo lo lea
    const articlesText = batch.map((art, index) => 
      `--- NOTICIA ${index + 1} ---
Titular: ${art.title}
Fecha: ${art.date}
Medio: ${art.source}
Enlace: ${art.url}
Contenido Limpio: ${art.content.substring(0, 3000)}`
    ).join('\n\n');

    // Prompt optimizado indicando el esquema de datos esperado
    const prompt = `
Eres un asistente experto en análisis político. Analiza el siguiente lote de noticias sobre el candidato "${candidateName}".
Devuelve ÚNICAMENTE un array de objetos JSON con esta estructura exacta por cada noticia:
[
  {
    "titular": "...",
    "fecha": "...",
    "medio_prensa": "...",
    "enlace_origen": "...",
    "resumen_noticia": "Resumen conciso y objetivo de la noticia en no más de 3 oraciones.",
    "categoria": "Palabra clave principal (ej. Corrupción, Campaña, Propuesta, Económico)",
    "sentimiento": "Positivo, Negativo o Neutral",
    "sesgo_politico": "Describe el tono o sesgo político (ej. Crítico, Favorable, Informativo)",
    "entidades_clave": ["Nombres de personas", "Organizaciones", "Lugares mencionados"]
  }
]

Textos a analizar:
${articlesText}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Ya no necesitamos limpieza con Regex porque responseMimeType garantiza un JSON puro
      const parsedData = JSON.parse(responseText);
      
      logger.info(`Lote de ${parsedData.length} noticias procesado exitosamente por IA.`);
      return parsedData;

    } catch (error) {
      // RNF09: Debe resolver a tiempo y no caerse ante fallos
      logger.error(`Error al procesar lote de noticias con Gemini API: ${error.message}`);
      return [];
    }
  }

  /**
   * Procesa todas las noticias en lotes (batching) para no saturar los límites de Gemini.
   */
  async processAllArticles(articles, candidateName, batchSize = 5) {
    let processedResults = [];
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchResults = await this.processArticleBatch(batch, candidateName);
      processedResults = processedResults.concat(batchResults);

      // MEJORA: Pausa táctica de 15 segundos entre lotes para evadir el bloqueo HTTP 429 (Too Many Requests)
      if (i + batchSize < articles.length) {
        logger.info(`Esperando 15 segundos para no exceder el Rate Limit de Gemini...`);
        await sleep(15000);
      }
    }

    return processedResults;
  }
}

module.exports = new AIService();