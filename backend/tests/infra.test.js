const mongoose = require('mongoose');
const connectDB = require('../config/db');

// 1. Simulamos por completo la librería de Mongoose
jest.mock('mongoose');

describe('Pruebas de Infraestructura - db.js', () => {
    
    test('Debe simular una conexión exitosa a MongoDB para cubrir las líneas', async () => {
        // Simulamos que mongoose.connect devuelve un objeto de conexión exitoso
        mongoose.connect.mockResolvedValue({
            connection: { host: 'localhost_mock' }
        });

        // Espiamos el console.log para que no ensucie la pantalla de la consola
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Ejecutamos la función de db.js. Ahora sí entrará al bloque try{}
        await connectDB();

        // Validamos que se haya llamado a la función de conectar
        expect(mongoose.connect).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MongoDB Conectado'));

        // Limpiamos el espía
        consoleSpy.mockRestore();
    });

    test('Debe manejar un error de conexión fallida en el bloque catch', async () => {
        // Simulamos que la conexión arroja un error
        mongoose.connect.mockRejectedValue(new Error('Conexión rechazada'));
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // Simulamos el process.exit para que el test no se cierre real
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

        await connectDB();

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(1); // Verifica que intente detener la app de forma segura

        consoleErrorSpy.mockRestore();
        exitSpy.mockRestore();
    });
});