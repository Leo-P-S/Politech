const request = require('supertest');
const app = require('../app');
const Candidato = require('../models/Candidato');

// Simulamos el modelo de Mongoose para no tocar la base de datos real en los tests
jest.mock('../models/Candidato');

describe('Pruebas Unitarias - Endpoints de Candidatos', () => {
    
    // CASO 1: Cuando FUNCIONA (Happy Path)
    test('POST /api/candidatos - Debe guardar un candidato con éxito', async () => {
        const candidatoMock = {
            nombre: "Candidato de Prueba",
            partidoPolitico: "Partido Tecnológico"
        };

        // Simulamos que el método save() de Mongoose responde exitosamente
        Candidato.prototype.save.mockResolvedValue(candidatoMock);

        const res = await request(app)
            .post('/api/candidatos')
            .send(candidatoMock);

        expect(res.statusCode).toBe(201);
        expect(res.body.nombre).toBe("Candidato de Prueba");
    });

    // CASO 2: Cuando NO FUNCIONA (Sad Path)
    test('POST /api/candidatos - Debe manejar el error 500 si la base de datos falla', async () => {
        // Simulamos que la base de datos se cae o tira un error interno
        Candidato.prototype.save.mockRejectedValue(new Error('Error de conexión simulado'));

        const res = await request(app)
            .post('/api/candidatos')
            .send({ nombre: "Candidato Fallido" });

        expect(res.statusCode).toBe(500);
        expect(res.body.mensaje).toBe('Error al crear el candidato en la base de datos');
    });

    // CASO 3: GET funciona correctamente
    test('GET /api/candidatos - Debe listar todos los candidatos', async () => {
        const listaMock = [{ nombre: "Candidato A" }, { nombre: "Candidato B" }];
        
        // Simulamos el método find() de Mongoose
        Candidato.find.mockResolvedValue(listaMock);

        const res = await request(app).get('/api/candidatos');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });
});