const request = require('supertest');
const app = require('../app');
const Candidato = require('../models/Candidato');
const { faker } = require('@faker-js/faker');

jest.mock('../models/Candidato');

describe('Pruebas de Integración - Endpoints de Candidatos', () => {
    
    // CASO 1: Cuando FUNCIONA (Happy Path) - Crear candidato
    test('POST /api/candidatos - Debe guardar un candidato con éxito en la BD real', async () => {
        // Usamos la sintaxis correcta de Faker v7
        const candidatoFalso = {
            nombre: faker.name.fullName(),
            partidoPolitico: faker.company.name()
        };

        // Simulamos el guardado exitoso
        Candidato.prototype.save = jest.fn().mockResolvedValue({
            _id: 'mocked-id-123',
            ...candidatoFalso
        });

        const res = await request(app)
            .post('/api/candidatos')
            .send(candidatoFalso);

        expect(res.statusCode).toBe(201);
        expect(res.body.nombre).toBe(candidatoFalso.nombre);
        // Validamos que la base de datos real le haya asignado un ID único
        expect(res.body._id).toBeDefined(); 
    });

    // CASO 2: Cuando NO FUNCIONA (Sad Path) - Validación de Mongoose
    test('POST /api/candidatos - Debe fallar si faltan datos obligatorios', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Simulamos un error de Mongoose
        Candidato.prototype.save = jest.fn().mockRejectedValue(new Error('Validation failed'));

        // Enviamos un objeto vacío. El motor real de Mongoose rechazará la petición
        // porque en tu modelo 'nombre' y 'partidoPolitico' son obligatorios.
        const res = await request(app)
            .post('/api/candidatos')
            .send({});

        expect(res.statusCode).toBe(500);
        expect(res.body.mensaje).toBe('Error al crear el candidato en la base de datos');
        
        consoleSpy.mockRestore();
    });

    // CASO 3: GET funciona correctamente con datos reales
    test('GET /api/candidatos - Debe listar los candidatos guardados', async () => {
        // Simulamos la respuesta de la BD
        Candidato.find = jest.fn().mockResolvedValue([
            { nombre: "Candidato A", partidoPolitico: "Partido X" },
            { nombre: "Candidato B", partidoPolitico: "Partido Y" }
        ]);

        // 2. Hacemos la petición GET a tu API
        const res = await request(app).get('/api/candidatos');

        // 3. Verificamos que traiga exactamente los que acabamos de crear
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });

    // CASO 4: GET falla (Forzamos un error para cubrir las últimas líneas)
    test('GET /api/candidatos - Debe manejar el error 500 si la base de datos falla', async () => {
        // Como estamos usando una BD real, usamos spyOn para forzar 
        // a que SOLO esta consulta falle y así probar tu bloque 'catch'.
        const findSpy = jest.spyOn(Candidato, 'find').mockRejectedValueOnce(new Error('Fallo de lectura en memoria'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const res = await request(app).get('/api/candidatos');

        expect(res.statusCode).toBe(500);
        expect(res.body.mensaje).toBe('Error al obtener la información');

        findSpy.mockRestore();
        consoleSpy.mockRestore();
    });

    test('DELETE /api/candidatos/:id - Debe eliminar un candidato con éxito', async () => {
        Candidato.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: '123' });
        const res = await request(app).delete('/api/candidatos/123');
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Candidato eliminado exitosamente');
    });

    test('DELETE /api/candidatos/:id - Debe retornar 404 si el candidato no existe', async () => {
        Candidato.findByIdAndDelete = jest.fn().mockResolvedValue(null);
        const res = await request(app).delete('/api/candidatos/123');
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('Candidato no encontrado');
    });

    test('DELETE /api/candidatos/:candidateId/news/:newsId - Debe eliminar la noticia', async () => {
        Candidato.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: '123' });
        const res = await request(app).delete('/api/candidatos/123/news/456');
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Noticia eliminada exitosamente');
    });

    test('DELETE /api/candidatos/:candidateId/news/:newsId - Debe retornar 404 si el candidato no existe', async () => {
        Candidato.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
        const res = await request(app).delete('/api/candidatos/123/news/456');
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('Candidato no encontrado');
    });
});