const mongoose = require('mongoose');

/**
 * @module Candidate
 * @description Modelo principal de datos del módulo de IA/Scraping.
 * 
 * Cada documento representa a un candidato político.
 * Su campo más relevante para consumidores externos es `historial_noticias`,
 * un array de noticias enriquecidas por la IA.
 * 
 * Colección MongoDB: `candidates`
 */

/**
 * @typedef {Object} AnalisisIA
 * @description Resultado del análisis de Gemini sobre una noticia.
 *              Se rellena asincrónicamente vía POST /api/ai/process.
 *              Es null/undefined hasta que se procese.
 * @property {string} resumen_noticia   - Resumen objetivo en ≤3 oraciones
 * @property {string} categoria         - Palabra clave principal (ej: "Corrupción", "Campaña", "Propuesta")
 * @property {string} sentimiento       - "Positivo" | "Negativo" | "Neutral"
 * @property {string} sesgo_politico    - Descripción del tono (ej: "Crítico", "Favorable", "Informativo")
 * @property {string[]} entidades_clave - Personas, organizaciones y lugares mencionados
 */

/**
 * @typedef {Object} Noticia
 * @property {string}    titular         - Título de la noticia (extraído del scraper)
 * @property {string}    fecha           - Fecha de publicación en formato "YYYY-MM-DD"
 * @property {string}    medio_prensa    - Nombre de la fuente (ej: "El Comercio", "GDELT")
 * @property {string}    enlace_origen   - URL original del artículo (único por candidato)
 * @property {string}    [contenido_crudo] - Texto plano extraído de la URL. Usado por la IA y para deduplicación.
 * @property {boolean}   procesado_por_ia  - true si `analisis_ia` ya fue completado por Gemini
 * @property {AnalisisIA} [analisis_ia]   - Resultado del análisis. null hasta ser procesado.
 */
const newsSchema = new mongoose.Schema({
  titular:         { type: String, required: true },
  fecha:           { type: String, required: true },
  medio_prensa:    { type: String, required: true },
  enlace_origen:   { type: String, required: true },
  
  // Texto plano descargado del artículo. Input del pipeline de IA.
  contenido_crudo: { type: String },
  
  // Flag del pipeline: false = pendiente de procesar, true = analisis_ia disponible
  procesado_por_ia: { type: Boolean, default: false },
  
  // Output de Gemini (ver typedef AnalisisIA arriba para la estructura exacta)
  analisis_ia: { type: mongoose.Schema.Types.Mixed }
});

/**
 * @typedef {Object} Candidate
 * @property {string}    nombre              - Nombre completo del candidato (único en la colección)
 * @property {string}    [partido]           - Partido político (campo reservado para futuro uso)
 * @property {Noticia[]} historial_noticias  - Lista de noticias procesadas por el pipeline
 * @property {Date}      createdAt           - Fecha de creación (auto-gestionado por Mongoose)
 * @property {Date}      updatedAt           - Última modificación (auto-gestionado por Mongoose)
 */
const candidateSchema = new mongoose.Schema({
  nombre:  { type: String, required: true, unique: true },
  partido: { type: String },
  historial_noticias: [newsSchema]
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
