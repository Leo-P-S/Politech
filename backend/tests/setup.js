const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Aumentamos el tiempo de espera de Jest a 60 segundos
jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
    await mongoose.disconnect();
    
    // Le damos hasta 60 segundos a MongoDB para descargarse y arrancar
    mongoServer = await MongoMemoryServer.create({
        instance: { startupTimeout: 60000 } 
    });
    
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// 2. Después de cada test: Limpiar las colecciones (equivalente al truncate de la guía del profe)
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const collection of Object.values(collections)) {
        await collection.deleteMany(); // Borra los documentos, pero mantiene la estructura
    }
});

// 3. Al final de todos los tests: Desconectar y apagar el servidor
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});