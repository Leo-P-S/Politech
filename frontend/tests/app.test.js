const request = require('supertest');
const express = require('express');
const http = require('http');

// Mockear sendFile globalmente para Express para no depender de archivos físicos en tests
express.response.sendFile = jest.fn(function (path) {
    this.status(200).send('mocked file: ' + path);
});

const app = require('../app');

describe('Pruebas Unitarias - Servidor Frontend', () => {
    let mockReq;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            on: jest.fn(),
            end: jest.fn(),
            pipe: jest.fn(),
            write: jest.fn()
        };
    });

    test('GET / - Debe devolver el archivo index.html exitosamente', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /health - Debe devolver el estado healthy para el CI/CD', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('healthy');
    });

    test('GET /legacy-login - Debe devolver legacy-login.html', async () => {
        const res = await request(app).get('/legacy-login');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('legacy-login.html');
    });

    test('GET /dashboard - Debe devolver legacy-dashboard.html', async () => {
        const res = await request(app).get('/dashboard');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('legacy-dashboard.html');
    });

    test('GET /any-other-route (Catch-all) - Debe devolver index.html', async () => {
        const res = await request(app).get('/some-react-route');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('index.html');
    });

    describe('Proxy API (/api/*)', () => {
        let requestSpy;
        let mockRes;
        let simulateError;
        const originalRequest = http.request;

        beforeEach(() => {
            simulateError = false;
            mockRes = {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                pipe: jest.fn((dest) => {
                    dest.write(JSON.stringify({ success: true }));
                    dest.end();
                }),
                destroy: jest.fn()
            };

            requestSpy = jest.spyOn(http, 'request').mockImplementation((options, callback) => {
                const port = options.port;
                if (port === 3000) {
                    if (simulateError) {
                        setTimeout(() => {
                            const errorCb = mockReq.on.mock.calls.find(call => call[0] === 'error')?.[1];
                            if (errorCb) errorCb(new Error('Connection refused'));
                        }, 5);
                        return mockReq;
                    }
                    if (callback) callback(mockRes);
                    return mockReq;
                }
                return originalRequest(options, callback);
            });
        });

        afterEach(() => {
            requestSpy.mockRestore();
        });

        test('Debe redirigir peticiones GET de API mediante proxy', async () => {
            const res = await request(app).get('/api/candidates');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(requestSpy).toHaveBeenCalled();
            expect(mockReq.end).toHaveBeenCalled();
        });

        test('Debe redirigir peticiones POST de API haciendo pipe de la petición', async () => {
            mockRes.statusCode = 201;
            mockRes.pipe = jest.fn((dest) => {
                dest.end();
            });

            const res = await request(app)
                .post('/api/candidatos')
                .send({ nombre: 'Test' });

            expect(res.statusCode).toBe(201);
            expect(requestSpy).toHaveBeenCalled();
        });

        test('Debe dar soporte especial a SSE (Server-Sent Events)', async () => {
            mockRes.headers = { 'content-type': 'text/event-stream' };
            mockRes.pipe = jest.fn((dest) => {
                dest.write('data: test\n\n');
                dest.end();
            });

            const res = await request(app)
                .get('/api/logs/stream')
                .set('Connection', 'keep-alive');

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');
        });

        test('Debe manejar error 502 si falla la conexión al backend', async () => {
            simulateError = true;

            const res = await request(app).get('/api/candidates');
            expect(res.statusCode).toBe(502);
            expect(res.body.error).toContain('Fallo al conectar');
        });
    });
});