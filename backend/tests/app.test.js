const request = require('supertest');

// Mockear el worker completo para evitar que Jest intente parsear
// las dependencias ESM de jsdom y @mozilla/readability
jest.mock('../worker/index', () => ({
    runPipelineForCandidate: jest.fn().mockResolvedValue({ status: 'ok' })
}));

// Mockear cronManager
jest.mock('../cron/cronManager', () => ({
    scheduleAITask: jest.fn().mockResolvedValue({}),
    runAIBatchProcess: jest.fn().mockResolvedValue({})
}));

// Mockear mongoose para que no intente conectarse a una BD real en los tests
const mockFind = jest.fn().mockResolvedValue([]);
const mockFindOne = jest.fn().mockResolvedValue(null);
const mockFindById = jest.fn().mockResolvedValue(null);
const mockCreate = jest.fn().mockResolvedValue({});

jest.mock('mongoose', () => {
    function SchemaMock() {
        this.pre = jest.fn();
        this.post = jest.fn();
        this.set = jest.fn();
        this.methods = {};
    }
    SchemaMock.Types = { Mixed: {} };

    const mockModelObj = {
        find: jest.fn(() => ({
            sort: jest.fn().mockResolvedValue([])
        })),
        findById: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        findByIdAndDelete: jest.fn().mockResolvedValue(null),
        findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    };
    // Hacer accesibles las referencias de mocks
    mockModelObj.find = mockFind;
    mockModelObj.findOne = mockFindOne;
    mockModelObj.findById = mockFindById;
    mockModelObj.create = mockCreate;

    return {
        connect: jest.fn().mockResolvedValue({}),
        Schema: SchemaMock,
        model: jest.fn().mockReturnValue(mockModelObj),
    };
});

// Mockear el middleware de autenticación para que las pruebas pasen con rol admin
jest.mock('../middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { id: 'admin-123', username: 'admin', role: 'admin' };
    req.admin = req.user;
    next();
});

const app = require('../app');

beforeEach(() => {
    jest.clearAllMocks();
});

test('GET / retorna status ok', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /health retorna healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
});

test('GET /ruta-inexistente retorna 404', async () => {
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.statusCode).toBe(404);
});

test('POST /api/trigger retorna 400 si faltan parámetros', async () => {
    const res = await request(app).post('/api/trigger').send({});
    expect(res.statusCode).toBe(400);
});

test('POST /api/trigger retorna 404 si el candidato no existe', async () => {
    mockFindById.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/trigger').send({
        candidateId: '650f12345678901234567890',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
    });
    expect(res.statusCode).toBe(404);
});

test('POST /api/trigger retorna 200 si el candidato existe e inicia el scraping', async () => {
    mockFindById.mockResolvedValueOnce({
        _id: '650f12345678901234567890',
        nombre: 'Candidato Test'
    });
    const res = await request(app).post('/api/trigger').send({
        candidateId: '650f12345678901234567890',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('started');
});

test('POST /api/ai/process retorna 200 y mensaje de inicio', async () => {
    const res = await request(app).post('/api/ai/process');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('started');
});

test('GET /api/config/ai-schedule retorna la configuración del cron', async () => {
    mockFindOne.mockResolvedValueOnce({
        cron_day: 1,
        cron_hour: 4
    });
    const res = await request(app).get('/api/config/ai-schedule');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ day: 1, hour: 4 });
});

test('GET /api/config/ai-schedule crea configuración por defecto si no existe', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({
        cron_day: 0,
        cron_hour: 3
    });
    const res = await request(app).get('/api/config/ai-schedule');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ day: 0, hour: 3 });
});

test('POST /api/config/ai-schedule actualiza la configuración', async () => {
    const mockConfigDoc = {
        cron_day: 0,
        cron_hour: 3,
        save: jest.fn().mockResolvedValue(true)
    };
    mockFindOne.mockResolvedValueOnce(mockConfigDoc);
    const res = await request(app).post('/api/config/ai-schedule').send({
        day: 2,
        hour: 5
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('updated');
    expect(mockConfigDoc.cron_day).toBe(2);
    expect(mockConfigDoc.cron_hour).toBe(5);
    expect(mockConfigDoc.save).toHaveBeenCalled();
});