const request = require('supertest');
const mongoose = require('mongoose');
require('./setup');
const app = require('../app');
const Candidato = require('../models/Candidato');
const Admin = require('../models/Admin');
const Elector = require('../models/Elector');
const jwt = require('jsonwebtoken');

describe('Pruebas de Integración - Candidatos (Base de Datos Real)', () => {
    let adminToken;
    let electorToken;

    beforeEach(async () => {
        // Limpiamos colecciones antes de cada test (hecho por setup.js, pero aseguramos usuarios)
        const admin = await Admin.create({ username: 'admin_routes', password: 'password123' });
        adminToken = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );

        const elector = await Elector.create({ username: 'elector_routes', password: 'password123' });
        electorToken = jwt.sign(
            { id: elector._id, username: elector.username, role: 'elector' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );
    });

    describe('POST /api/candidatos (Creación)', () => {
        test('Debe permitir crear candidato si es admin', async () => {
            const res = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({
                    nombre: 'Keiko Fujimori',
                    partidoPolitico: 'Fuerza Popular',
                    fotoUrl: 'https://example.com/keiko.jpg'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.nombre).toBe('Keiko Fujimori');
            expect(res.body.partidoPolitico).toBe('Fuerza Popular');
            expect(res.body.fotoUrl).toBe('https://example.com/keiko.jpg');
            expect(res.body.equipoTrabajo).toEqual([]);
        });

        test('Debe rechazar una URL de fotografía inválida', async () => {
            const res = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({ nombre: 'Candidato Foto', fotoUrl: 'javascript:alert(1)' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('http/https');
        });

        test('Debe fallar con 403 si el rol no es admin', async () => {
            const res = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${electorToken}`])
                .send({ nombre: 'Keiko Fujimori', partidoPolitico: 'Fuerza Popular' });

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toContain('Acceso denegado');
        });

        test('Debe fallar con 400 si el nombre es demasiado corto o falta', async () => {
            const res1 = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({ nombre: 'A' });
            expect(res1.statusCode).toBe(400);

            const res2 = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({ partidoPolitico: 'Partido' });
            expect(res2.statusCode).toBe(400);
        });

        test('Debe fallar con 409 si el candidato ya existe', async () => {
            await Candidato.create({ nombre: 'Keiko Fujimori', partidoPolitico: 'Fuerza Popular' });

            const res = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({ nombre: 'Keiko Fujimori' });

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toBe('Ya existe un candidato con ese nombre.');
        });

        test('Debe manejar error interno de base de datos al guardar', async () => {
            const saveSpy = jest.spyOn(Candidato.prototype, 'save').mockRejectedValueOnce(new Error('Save Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .post('/api/candidatos')
                .set('Cookie', [`token=${adminToken}`])
                .send({ nombre: 'Nuevo Candidato' });

            expect(res.statusCode).toBe(500);
            expect(res.body.mensaje).toBe('Error al crear el candidato en la base de datos');

            saveSpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });

    describe('GET /api/candidatos/search (Búsqueda autocompletado)', () => {
        beforeEach(async () => {
            await Candidato.create([
                { nombre: 'Alan García', partidoPolitico: 'APRA' },
                { nombre: 'Ollanta Humala', partidoPolitico: 'Partido Nacionalista' }
            ]);
        });

        test('Debe buscar candidatos por nombre o partido si q >= 3 caracteres', async () => {
            const res1 = await request(app).get('/api/candidatos/search?q=Garc');
            expect(res1.statusCode).toBe(200);
            expect(res1.body).toHaveLength(1);
            expect(res1.body[0].nombre).toBe('Alan García');

            const res2 = await request(app).get('/api/candidatos/search?q=Nacio');
            expect(res2.statusCode).toBe(200);
            expect(res2.body).toHaveLength(1);
            expect(res2.body[0].nombre).toBe('Ollanta Humala');
        });

        test('Debe retornar vacio si q < 3 caracteres o falta', async () => {
            const res1 = await request(app).get('/api/candidatos/search?q=al');
            expect(res1.body).toEqual([]);

            const res2 = await request(app).get('/api/candidatos/search');
            expect(res2.body).toEqual([]);
        });

        test('Debe manejar errores de base de datos en búsqueda', async () => {
            const findSpy = jest.spyOn(Candidato, 'find').mockImplementationOnce(() => {
                return {
                    lean: jest.fn().mockReturnThis(),
                    select: jest.fn().mockRejectedValueOnce(new Error('Search DB fail'))
                };
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app).get('/api/candidatos/search?q=alan');
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Search DB fail');

            findSpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });

    describe('GET /api/candidatos/available', () => {
        test('Debe devolver candidatos ordenados con campos básicos', async () => {
            await Candidato.create([
                { nombre: 'Zeta Candidato', partidoPolitico: 'Partido Z' },
                { nombre: 'Alfa Candidato', partidoPolitico: 'Partido A' }
            ]);

            const res = await request(app).get('/api/candidatos/available');

            expect(res.statusCode).toBe(200);
            expect(res.body.map(candidato => candidato.nombre)).toEqual(['Alfa Candidato', 'Zeta Candidato']);
            expect(res.body[0].historial_noticias).toBeUndefined();
        });
    });

    describe('PATCH /api/candidatos/:id', () => {
        test('Debe editar datos básicos sin perder el resto del perfil', async () => {
            const candidato = await Candidato.create({
                nombre: 'Nombre Original',
                partidoPolitico: 'Partido Original',
                propuestas: ['Propuesta existente']
            });

            const res = await request(app)
                .patch(`/api/candidatos/${candidato._id}`)
                .set('Cookie', [`token=${adminToken}`])
                .send({
                    nombre: 'Nombre Actualizado',
                    partidoPolitico: 'Partido Actualizado',
                    fotoUrl: 'https://example.com/foto.jpg'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.nombre).toBe('Nombre Actualizado');
            expect(res.body.fotoUrl).toBe('https://example.com/foto.jpg');
            expect(res.body.propuestas).toEqual(['Propuesta existente']);
        });

        test('Debe permitir quitar la fotografía', async () => {
            const candidato = await Candidato.create({
                nombre: 'Candidato Con Foto',
                fotoUrl: 'https://example.com/anterior.jpg'
            });

            const res = await request(app)
                .patch(`/api/candidatos/${candidato._id}`)
                .set('Cookie', [`token=${adminToken}`])
                .send({ nombre: candidato.nombre, partidoPolitico: 'Independiente', fotoUrl: '' });

            expect(res.statusCode).toBe(200);
            expect(res.body.fotoUrl).toBeUndefined();
        });
    });

    describe('GET /api/candidatos (Listado y Detalle)', () => {
        let candId;
        beforeEach(async () => {
            const cand = await Candidato.create({ nombre: 'Pedro Castillo', partidoPolitico: 'Perú Libre' });
            candId = cand._id.toString();
        });

        test('GET / - Debe listar todos los candidatos', async () => {
            const res = await request(app).get('/api/candidatos');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].nombre).toBe('Pedro Castillo');
        });

        test('GET /:id - Debe obtener detalles del candidato', async () => {
            const res = await request(app).get(`/api/candidatos/${candId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.nombre).toBe('Pedro Castillo');
        });

        test('GET /:id - Debe retornar 404 si no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const res = await request(app).get(`/api/candidatos/${fakeId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Candidato no encontrado');
        });

        test('GET /:id - Debe retornar 500 si el ID es malformado o error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await request(app).get('/api/candidatos/id_invalido');
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBeDefined();
            consoleSpy.mockRestore();
        });
    });

    describe('DELETE /api/candidatos/:id (Eliminación)', () => {
        let candId;
        beforeEach(async () => {
            const cand = await Candidato.create({ nombre: 'Pedro Castillo', partidoPolitico: 'Perú Libre' });
            candId = cand._id.toString();
        });

        test('Debe permitir eliminar si es admin', async () => {
            const res = await request(app)
                .delete(`/api/candidatos/${candId}`)
                .set('Cookie', [`token=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Candidato eliminado exitosamente');

            const deleted = await Candidato.findById(candId);
            expect(deleted).toBeNull();
        });

        test('Debe retornar 404 si intenta eliminar candidato que no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .delete(`/api/candidatos/${fakeId}`)
                .set('Cookie', [`token=${adminToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Candidato no encontrado');
        });

        test('Debe retornar 500 en caso de error en delete', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await request(app)
                .delete('/api/candidatos/invalido')
                .set('Cookie', [`token=${adminToken}`]);
            expect(res.statusCode).toBe(500);
            consoleSpy.mockRestore();
        });
    });

    describe('DELETE /api/candidatos/:candidateId/news/:newsId (Eliminar noticia)', () => {
        let candId;
        let newsId = new mongoose.Types.ObjectId().toString();

        beforeEach(async () => {
            const cand = await Candidato.create({
                nombre: 'Pedro Castillo',
                partidoPolitico: 'Perú Libre',
                historial_noticias: [
                    {
                        _id: newsId,
                        titular: 'Noticia a borrar',
                        enlace_origen: 'http://test.com',
                        resumen_noticia: 'Test',
                        fecha: '2023-01-01'
                    }
                ]
            });
            candId = cand._id.toString();
        });

        test('Debe eliminar una noticia si es admin', async () => {
            const res = await request(app)
                .delete(`/api/candidatos/${candId}/news/${newsId}`)
                .set('Cookie', [`token=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Noticia eliminada exitosamente');
            expect(res.body.candidate.historial_noticias).toHaveLength(0);
        });

        test('Debe retornar 404 si candidato no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .delete(`/api/candidatos/${fakeId}/news/${newsId}`)
                .set('Cookie', [`token=${adminToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Candidato no encontrado');
        });

        test('Debe retornar 500 en caso de error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await request(app)
                .delete(`/api/candidatos/${candId}/news/invalido`)
                .set('Cookie', [`token=${adminToken}`]);
            expect(res.statusCode).toBe(500);
            consoleSpy.mockRestore();
        });
    });
});
