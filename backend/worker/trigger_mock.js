require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./logger');
const { runPipelineForCandidate } = require('./index');

// Activamos el modo mock para evadir peticiones HTTP reales y llamadas a la API de Gemini
process.env.MOCK_MODE = 'true';

async function triggerMock() {
  logger.info('--- INICIANDO EJECUCIÓN MOCK A VOLUNTAD ---');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/politech';
  try {
    await mongoose.connect(mongoUri);
    logger.info('Conectado a MongoDB Exitosamente para el Mock');
  } catch (dbError) {
    logger.error(`Fallo crítico al conectar a MongoDB: ${dbError.message}`);
    process.exit(1);
  }

  try {
    // Ejecutamos el pipeline con un candidato de prueba
    await runPipelineForCandidate('Candidato de Prueba MOCK', '2023-01-01', '2023-12-31');
    logger.info('--- EJECUCIÓN MOCK FINALIZADA CON ÉXITO ---');
  } catch (error) {
    logger.error('Error durante la ejecución del mock: ' + error.message);
  } finally {
    // Cerramos la conexión a la base de datos para que el script termine
    await mongoose.disconnect();
    process.exit(0);
  }
}

triggerMock();
