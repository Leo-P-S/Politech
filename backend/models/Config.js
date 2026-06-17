const mongoose = require('mongoose');

/**
 * Modelo de Configuración Global
 * Almacena las configuraciones dinámicas como el horario en el que se ejecuta 
 * automáticamente el pipeline de IA para generar los resúmenes semanales.
 */
const configSchema = new mongoose.Schema({
  // Identificador único para el documento de configuración global
  key: { type: String, required: true, unique: true, default: 'global_config' },
  
  // Día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  cron_day: { type: Number, default: 0 },
  
  // Hora del día en formato militar 0-23
  cron_hour: { type: Number, default: 3 }
});

module.exports = mongoose.model('Config', configSchema);
