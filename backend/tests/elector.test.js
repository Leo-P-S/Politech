const request = require('supertest');
const app = require('../app');
const Elector = require('../models/Elector');
const Candidato = require('../models/Candidato');

jest.mock('../models/Elector');
jest.mock('../models/Candidato');

// Mockear el middleware para simular que está autenticado como Elector
jest.mock('../middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { id: 'mocked-elector-123', username: 'test-elector', role: 'elector' };
    next();
});

describe('Pruebas de Integración - Endpoints de Elector (Búsquedas y Alertas)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('GET /api/elector/searches - Debe retornar la lista de búsquedas recientes', async () => {
        Elector.findById = jest.fn().mockResolvedValue({
            _id: 'mocked-elector-123',
            recentSearches: ['candidato 1', 'candidato 2']
        });

        const res = await request(app).get('/api/elector/searches');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(['candidato 1', 'candidato 2']);
    });

    test('POST /api/elector/searches - Debe guardar una nueva búsqueda', async () => {
        const mockElectorDoc = {
            _id: 'mocked-elector-123',
            recentSearches: ['candidato 1'],
            save: jest.fn().mockResolvedValue(true)
        };
        Elector.findById = jest.fn().mockResolvedValue(mockElectorDoc);

        const res = await request(app)
            .post('/api/elector/searches')
            .send({ query: 'candidato 2' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toContain('candidato 2');
        expect(mockElectorDoc.save).toHaveBeenCalled();
    });

    test('POST /api/elector/searches - Debe fallar si la búsqueda está vacía', async () => {
        const res = await request(app)
            .post('/api/elector/searches')
            .send({ query: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('La consulta no puede estar vacía.');
    });

    test('POST /api/elector/alerts/subscribe - Debe suscribirse a las alertas de un candidato', async () => {
        Candidato.findById = jest.fn().mockResolvedValue({
            _id: 'candidato-123',
            nombre: 'Juan Pérez'
        });

        const mockElectorDoc = {
            _id: 'mocked-elector-123',
            alertSubscriptions: [],
            save: jest.fn().mockResolvedValue(true)
        };
        Elector.findById = jest.fn().mockResolvedValue(mockElectorDoc);

        const res = await request(app)
            .post('/api/elector/alerts/subscribe')
            .send({ candidatoId: 'candidato-123' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Suscrito a las alertas de Juan Pérez con éxito.');
        expect(mockElectorDoc.alertSubscriptions).toContain('candidato-123');
        expect(mockElectorDoc.save).toHaveBeenCalled();
    });

    test('GET /api/elector/alerts - Debe retornar las alertas de candidatos suscritos', async () => {
        const populateMock = jest.fn().mockResolvedValue({
            _id: 'mocked-elector-123',
            alertSubscriptions: [
                {
                    _id: 'candidato-123',
                    nombre: 'Juan Pérez',
                    antecedentesJudiciales: ['Investigación por corrupción activa']
                }
            ]
        });

        Elector.findById = jest.fn().mockReturnValue({
            populate: populateMock
        });

        const res = await request(app).get('/api/elector/alerts');

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].nombreCandidato).toBe('Juan Pérez');
        expect(res.body[0].nivel).toBe('Alto');
        expect(res.body[0].mensaje).toBe('Investigación por corrupción activa');
    });
});
