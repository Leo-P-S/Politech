const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../logger');

class AIService {
  constructor() {
    // Inicializar Gemini con la API key de entorno
    const apiKey = process.env.GEMINI_API_KEY || 'dummy_key_for_testing';
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usamos el modelo recomendado para procesamiento general de texto
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
Contenido Limpio: ${art.content.substring(0, 3000)} // Truncamos a 3000 chars por noticia para ahorrar tokens
      `
    ).join('\n\n');

    const prompt = `
Eres un asistente experto en análisis político. A continuación te proporciono un lote de noticias sobre el candidato "${candidateName}".
Estructura exacta por cada noticia:
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

Asegúrate de procesar todas las noticias proporcionadas. No agregues comillas invertidas ni bloques \`\`\`json. Solo el array.

Textos a analizar:
${articlesText}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Limpieza defensiva en caso de que el modelo haya añadido formato de markdown
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(cleanedJson);
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
    }

    return processedResults;
  }
}

module.exports = new AIService();
