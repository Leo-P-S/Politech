const request = require('supertest');
const mongoose = require('mongoose');
require('./setup');
const app = require('../app');
const Candidato = require('../models/Candidato');
const Elector = require('../models/Elector');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

describe('Pruebas de Integración - Elector (Base de Datos Real)', () => {
    let electorToken;
    let electorId;
    let adminToken;

    beforeEach(async () => {
        const elector = await Elector.create({ username: 'test_elector_r', password: 'password123' });
        electorId = elector._id.toString();
        electorToken = jwt.sign(
            { id: electorId, username: elector.username, role: 'elector' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );

        const admin = await Admin.create({ username: 'test_admin_r', password: 'password123' });
        adminToken = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );
    });

    describe('Middlewares de Acceso', () => {
        test('Debe retornar 403 si un administrador intenta acceder a rutas de elector', async () => {
            const res = await request(app)
                .get('/api/elector/searches')
                .set('Cookie', [`token=${adminToken}`]);

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toBe('Acceso denegado. Se requiere cuenta de elector.');
        });
    });

    describe('GET /api/elector/searches (Búsquedas recientes)', () => {
        test('Debe retornar búsquedas vacías al inicio', async () => {
            const res = await request(app)
                .get('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('Debe retornar 404 si el elector no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .get('/api/elector/searches')
                .set('Cookie', [`token=${fakeToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Elector no encontrado');
        });

        test('Debe manejar errores de base de datos al obtener búsquedas', async () => {
            const findSpy = jest.spyOn(Elector, 'findById').mockRejectedValueOnce(new Error('DB Find Error'));
            const res = await request(app)
                .get('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`]);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('DB Find Error');
            findSpy.mockRestore();
        });
    });

    describe('POST /api/elector/searches (Registrar búsqueda)', () => {
        test('Debe registrar una nueva búsqueda', async () => {
            const res = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({ query: 'Candidato A' });

            expect(res.statusCode).toBe(200);
            expect(res.body).toContain('Candidato A');
        });

        test('Debe retornar 400 si la consulta está vacía o ausente', async () => {
            const res1 = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({ query: '' });
            expect(res1.statusCode).toBe(400);

            const res2 = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({});
            expect(res2.statusCode).toBe(400);
        });

        test('Debe retornar 404 si elector no existe al buscar', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${fakeToken}`])
                .send({ query: 'Candidato A' });

            expect(res.statusCode).toBe(404);
        });

        test('Debe manejar duplicados y limitar a 10 búsquedas', async () => {
            const electorDoc = await Elector.findById(electorId);
            electorDoc.recentSearches = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'];
            await electorDoc.save();

            // Insertamos B3 de nuevo (duplicado, debe subir al inicio)
            const res1 = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({ query: 'B3' });
            
            expect(res1.body[0]).toBe('B3');
            expect(res1.body.length).toBe(10);

            // Insertamos B11 (nueva, debe quitar B10 que quedó al final)
            const res2 = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({ query: 'B11' });

            expect(res2.body[0]).toBe('B11');
            expect(res2.body.length).toBe(10);
            expect(res2.body).not.toContain('B10');
        });

        test('Debe manejar errores al guardar búsqueda', async () => {
            const saveSpy = jest.spyOn(Elector.prototype, 'save').mockRejectedValueOnce(new Error('Save Error'));

            const res = await request(app)
                .post('/api/elector/searches')
                .set('Cookie', [`token=${electorToken}`])
                .send({ query: 'Error Query' });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Save Error');
            saveSpy.mockRestore();
        });
    });

    describe('POST /api/elector/alerts/subscribe (Suscripción)', () => {
        let candId;
        beforeEach(async () => {
            const cand = await Candidato.create({ nombre: 'Candidato Alertas' });
            candId = cand._id.toString();
        });

        test('Debe suscribirse exitosamente', async () => {
            const res = await request(app)
                .post('/api/elector/alerts/subscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({ candidatoId: candId });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('Suscrito a las alertas');

            const elector = await Elector.findById(electorId);
            expect(elector.alertSubscriptions.map(id => id.toString())).toContain(candId);
        });

        test('Debe retornar 400 si no se envía candidatoId', async () => {
            const res = await request(app)
                .post('/api/elector/alerts/subscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({});
            expect(res.statusCode).toBe(400);
        });

        test('Debe retornar 404 si candidato no existe', async () => {
            const fakeCandId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .post('/api/elector/alerts/subscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({ candidatoId: fakeCandId });
            expect(res.statusCode).toBe(404);
        });

        test('Debe retornar 404 si elector no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .post('/api/elector/alerts/subscribe')
                .set('Cookie', [`token=${fakeToken}`])
                .send({ candidatoId: candId });
            expect(res.statusCode).toBe(404);
        });

        test('Debe manejar errores de base de datos en suscripción', async () => {
            const findSpy = jest.spyOn(Candidato, 'findById').mockRejectedValueOnce(new Error('Sub DB Error'));
            const res = await request(app)
                .post('/api/elector/alerts/subscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({ candidatoId: candId });
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Sub DB Error');
            findSpy.mockRestore();
        });
    });

    describe('GET /api/elector/alerts (Alertas de suscritos)', () => {
        let candCleanId;
        let candMediumId;
        let candHighId;

        beforeEach(async () => {
            const candClean = await Candidato.create({
                nombre: 'Candidato Limpio',
                partidoPolitico: 'Partido Limpio'
            });
            candCleanId = candClean._id;

            const candMedium = await Candidato.create({
                nombre: 'Candidato Medio',
                antecedentesJudiciales: ['Investigación preliminar por colusión simple']
            });
            candMediumId = candMedium._id;

            const candHigh = await Candidato.create({
                nombre: 'Candidato Alto',
                antecedentesJudiciales: ['Sentencia firme por corrupción agravada']
            });
            candHighId = candHigh._id;

            const elector = await Elector.findById(electorId);
            elector.alertSubscriptions = [candCleanId, candMediumId, candHighId];
            await elector.save();
        });

        test('Debe retornar alertas clasificando niveles correctamente (Alto, Medio, Info)', async () => {
            const res = await request(app)
                .get('/api/elector/alerts')
                .set('Cookie', [`token=${electorToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(3);

            // Alerta Informativa (Limpio)
            const cleanAlert = res.body.find(a => a.candidatoId === candCleanId.toString());
            expect(cleanAlert.nivel).toBe('Info');
            expect(cleanAlert.mensaje).toContain('Sin antecedentes');

            // Alerta Media (Medio)
            const mediumAlert = res.body.find(a => a.candidatoId === candMediumId.toString());
            expect(mediumAlert.nivel).toBe('Medio');

            // Alerta Alta (Alto)
            const highAlert = res.body.find(a => a.candidatoId === candHighId.toString());
            expect(highAlert.nivel).toBe('Alto');
        });

        test('Debe retornar 404 si elector no existe al pedir alertas', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .get('/api/elector/alerts')
                .set('Cookie', [`token=${fakeToken}`]);
            expect(res.statusCode).toBe(404);
        });

        test('Debe manejar errores de base de datos al buscar alertas', async () => {
            const findSpy = jest.spyOn(Elector, 'findById').mockImplementationOnce(() => {
                return {
                    populate: jest.fn().mockRejectedValueOnce(new Error('Populate Error'))
                };
            });

            const res = await request(app)
                .get('/api/elector/alerts')
                .set('Cookie', [`token=${electorToken}`]);
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Populate Error');
            findSpy.mockRestore();
        });
    });

    describe('GET /api/elector/alerts/status/:candidatoId (Estado de alertas)', () => {
        let candId;
        beforeEach(async () => {
            const cand = await Candidato.create({ nombre: 'Candidato Status' });
            candId = cand._id.toString();
        });

        test('Debe verificar si está suscrito (true o false)', async () => {
            // Caso false
            const res1 = await request(app)
                .get(`/api/elector/alerts/status/${candId}`)
                .set('Cookie', [`token=${electorToken}`]);
            expect(res1.statusCode).toBe(200);
            expect(res1.body.subscribed).toBe(false);

            // Suscribirse
            const elector = await Elector.findById(electorId);
            elector.alertSubscriptions.push(candId);
            await elector.save();

            // Caso true
            const res2 = await request(app)
                .get(`/api/elector/alerts/status/${candId}`)
                .set('Cookie', [`token=${electorToken}`]);
            expect(res2.statusCode).toBe(200);
            expect(res2.body.subscribed).toBe(true);
        });

        test('Debe retornar 404 si el elector no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .get(`/api/elector/alerts/status/${candId}`)
                .set('Cookie', [`token=${fakeToken}`]);
            expect(res.statusCode).toBe(404);
        });

        test('Debe manejar errores de base de datos en estado de alertas', async () => {
            const findSpy = jest.spyOn(Elector, 'findById').mockRejectedValueOnce(new Error('Status DB Error'));
            const res = await request(app)
                .get(`/api/elector/alerts/status/${candId}`)
                .set('Cookie', [`token=${electorToken}`]);
            expect(res.statusCode).toBe(500);
            findSpy.mockRestore();
        });
    });

    describe('POST /api/elector/alerts/unsubscribe (Cancelar suscripción)', () => {
        let candId;
        beforeEach(async () => {
            const cand = await Candidato.create({ nombre: 'Candidato Unsubscribe' });
            candId = cand._id.toString();

            const elector = await Elector.findById(electorId);
            elector.alertSubscriptions.push(candId);
            await elector.save();
        });

        test('Debe desuscribirse exitosamente', async () => {
            const res = await request(app)
                .post('/api/elector/alerts/unsubscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({ candidatoId: candId });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('cancelada con éxito');

            const elector = await Elector.findById(electorId);
            expect(elector.alertSubscriptions.map(id => id.toString())).not.toContain(candId);
        });

        test('Debe retornar 400 si no se proporciona candidatoId', async () => {
            const res = await request(app)
                .post('/api/elector/alerts/unsubscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({});
            expect(res.statusCode).toBe(400);
        });

        test('Debe retornar 404 si el elector no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const fakeToken = jwt.sign({ id: fakeId, role: 'elector' }, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

            const res = await request(app)
                .post('/api/elector/alerts/unsubscribe')
                .set('Cookie', [`token=${fakeToken}`])
                .send({ candidatoId: candId });
            expect(res.statusCode).toBe(404);
        });

        test('Debe manejar errores de base de datos en desuscripción', async () => {
            const findSpy = jest.spyOn(Elector, 'findById').mockRejectedValueOnce(new Error('Unsub DB Error'));
            const res = await request(app)
                .post('/api/elector/alerts/unsubscribe')
                .set('Cookie', [`token=${electorToken}`])
                .send({ candidatoId: candId });
            expect(res.statusCode).toBe(500);
            findSpy.mockRestore();
        });
    });
});
