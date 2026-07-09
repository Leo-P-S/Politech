const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../logger');

class AIService {
  constructor() {
    // Inicializar Gemini con la API key de entorno
    const apiKey = process.env.GEMINI_API_KEY || 'dummy_key_for_testing';
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Usamos el modelo recomendado para procesamiento general de texto (Gemini 3.1 Flash-Lite)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
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
Eres un experto en periodismo y análisis político, altamente especializado en la compleja coyuntura política, social y legal de la República del Perú (comprendiendo a fondo las dinámicas entre el Congreso, el Ejecutivo, el Poder Judicial, el Ministerio Público, así como el clima de polarización ciudadana).

A continuación, te proporciono un lote de noticias sobre el candidato político peruano "${candidateName}". Tu tarea es evaluar cada noticia de manera estrictamente neutral y objetiva.

Debes devolver estrictamente un Arreglo JSON con la siguiente estructura exacta por cada noticia:
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

Al categorizar y determinar el sesgo y sentimiento, ten en cuenta el peso de las instituciones peruanas y el tono del periodismo local. Asegúrate de procesar todas las noticias proporcionadas. No agregues comillas invertidas ni bloques \`\`\`json. Solo el array.

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

      // Si no es el último lote, esperamos 4 segundos para evitar rate limit
      if (i + batchSize < articles.length) {
        logger.info(`Esperando 4 segundos antes de procesar el siguiente lote para ${candidateName}...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    return processedResults;
  }

  /**
   * Genera un resumen global (síntesis automática) para el candidato a partir de sus noticias.
   */
  async generateCandidateSummary(newsList, candidateName) {
    if (!newsList || newsList.length === 0) {
      return "Actualmente no hay suficiente información para generar una síntesis automática para este candidato.";
    }

    if (process.env.MOCK_MODE === 'true') {
      logger.info(`[MOCK MODE] Retornando resumen de candidato falso para ${candidateName}`);
      return `Keiko Fujimori es una política peruana y lideresa de Fuerza Popular. De acuerdo con las noticias analizadas por Inteligencia Artificial, su actividad reciente se centra en reuniones clave de coordinación política y transferencia de gobierno, incluyendo diálogos con Rafael López Aliaga sobre seguridad ciudadana, y coordinaciones de equipos técnicos dirigidos por Marco Vinelli. Su cobertura mediática actual mantiene un enfoque principalmente informativo con matices de debate sobre su entorno político.`;
    }

    const summariesText = newsList.map((news, index) => 
      `Noticia ${index + 1}:
Titular: ${news.titular}
Resumen IA: ${news.analisis_ia?.resumen_noticia || ''}
Sesgo: ${news.analisis_ia?.sesgo_politico || ''}
Sentimiento: ${news.analisis_ia?.sentimiento || ''}
`
    ).join('\n\n');

    const prompt = `
Eres un analista político peruano experto, de postura estrictamente neutral y objetiva, especializado en el seguimiento de actores políticos del país.

A partir del siguiente listado de resúmenes de noticias y análisis de la cobertura mediática sobre el candidato peruano "${candidateName}", genera una síntesis ejecutiva del perfil público reciente de este actor político.

La síntesis debe enmarcarse en el actual contexto sociopolítico del Perú. Debe ser formal, libre de apasionamientos, directa y basarse únicamente en los datos proporcionados, sin inventar información.

Extensión requerida: de 3 a 5 oraciones. Formato: texto plano, sin markdown.

Listado de noticias:
${summariesText}
`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error(`Error al generar resumen global de candidato con Gemini API: ${error.message}`);
      return "Error al generar la síntesis automática.";
    }
  }
}

module.exports = new AIService();
