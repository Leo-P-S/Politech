const request = require('supertest');

// Mockear el worker completo para evitar que Jest intente parsear
// las dependencias ESM de jsdom y @mozilla/readability
jest.mock('../worker/index', () => ({
    runPipelineForCandidate: jest.fn().mockResolvedValue({ status: 'ok' })
}));

// Mockear mongoose para que no intente conectarse a una BD real en los tests
jest.mock('mongoose', () => {
    // Schema debe ser un constructor (función) para que `new mongoose.Schema(...)` funcione
    function SchemaMock() {}
    SchemaMock.Types = { Mixed: {} };

    return {
        connect: jest.fn().mockResolvedValue({}),
        Schema: SchemaMock,
        model: jest.fn().mockReturnValue({
            find: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue(null),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            findByIdAndDelete: jest.fn().mockResolvedValue(null),
            findByIdAndUpdate: jest.fn().mockResolvedValue(null),
        }),
    };
});

const app = require('../app');

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