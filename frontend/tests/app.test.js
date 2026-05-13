const request = require('supertest');
const app = require('../app'); // Asegúrate de que la ruta coincida con tu estructura

test('GET / returns HTML login page', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    // Ahora verificamos que el servidor nos esté enviando un archivo HTML
    expect(res.headers['content-type']).toMatch(/text\/html/);
});

test('GET /health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
});