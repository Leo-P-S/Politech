const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  titular: { type: String, required: true },
  fecha: { type: String, required: true },
  medio_prensa: { type: String, required: true },
  enlace_origen: { type: String, required: true },
  
  // Datos Crudos del Scraper
  contenido_crudo: { type: String }, // Aquí se guarda el texto extraído antes de pasarlo a la IA
  
  // Estado del pipeline
  procesado_por_ia: { type: Boolean, default: false }, // Flag para saber si requiere pasar por Gemini
  
  // Datos procesados por IA (Se insertan a posteriori bajo demanda)
  analisis_ia: { type: mongoose.Schema.Types.Mixed } // Contendrá resumen, categoria, sentimiento, sesgo, entidades
});

const candidateSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  partido: { type: String },
  historial_noticias: [newsSchema]
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
