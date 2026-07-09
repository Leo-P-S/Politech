const winston = require('winston');
const EventEmitter = require('events');

// Emisor de eventos global para los logs de scraping
const logEmitter = new EventEmitter();

// Palabras clave permitidas para exponer a la interfaz web (Medida de Seguridad)
const SAFE_KEYWORDS = [
  'scraping', 'extracción', 'descubiertas', 'url', 'gdelt', 'newsapi', 
  'rss', 'candidato', 'retardo', 'objetivo', 'iniciando', 'finalizado', 
  'procesando', 'ia', 'lote', 'procesar', 'procesada', 'procesado', 
  'resumen', 'error', 'pendiente', 'completado', 'esperando', 'guardando'
];

class SSETransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const msgLower = (info.message || '').toLowerCase();
    const isSafe = SAFE_KEYWORDS.some(kw => msgLower.includes(kw));

    if (isSafe) {
      logEmitter.emit('log', info);
    }
    
    callback();
  }
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'worker-pipeline' },
  transports: [
    new winston.transports.File({ filename: 'logs/worker-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/worker-combined.log' }),
    new SSETransport() // Añadir nuestro transporte personalizado
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

logger.logEmitter = logEmitter;
module.exports = logger;
