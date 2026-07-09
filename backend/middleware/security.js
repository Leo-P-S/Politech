const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const securityMiddleware = [
  helmet(),
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }),
  mongoSanitize(),
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      message: 'Demasiadas solicitudes. Intente nuevamente más tarde.'
    }
  })
];

module.exports = securityMiddleware;    