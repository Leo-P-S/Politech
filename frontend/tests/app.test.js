const request = require('supertest');
const app = require('../app');

describe('Pruebas Unitarias - Servidor Frontend', () => {
    
    test('GET / - Debe devolver el archivo index.html exitosamente', async () => {
        const res = await request(app).get('/');
        
        expect(res.statusCode).toBe(200);
        // Verificamos que el servidor responda con un archivo HTML
        expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /health - Debe devolver el estado healthy para el CI/CD', async () => {
        const res = await request(app).get('/health');
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('healthy');
    });
});