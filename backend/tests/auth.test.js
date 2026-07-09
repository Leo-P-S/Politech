const request = require('supertest');
const mongoose = require('mongoose');
require('./setup');
const app = require('../app');
const Admin = require('../models/Admin');
const Elector = require('../models/Elector');
const jwt = require('jsonwebtoken');

describe('Pruebas de Integración - Rutas de Autenticación', () => {

    describe('Admin Registration', () => {
        test('POST /api/auth/admin/register - Debe registrar un admin exitosamente', async () => {
            const res = await request(app)
                .post('/api/auth/admin/register')
                .send({ username: 'new_admin', password: 'password123' });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('Administrador registrado exitosamente.');
            
            const savedAdmin = await Admin.findOne({ username: 'new_admin' });
            expect(savedAdmin).not.toBeNull();
        });

        test('POST /api/auth/admin/register - Debe fallar si falta el usuario o la contraseña', async () => {
            const res1 = await request(app)
                .post('/api/auth/admin/register')
                .send({ username: 'only_user' });
            expect(res1.statusCode).toBe(400);
            expect(res1.body.error).toBe('Usuario y contraseña son requeridos.');

            const res2 = await request(app)
                .post('/api/auth/admin/register')
                .send({ password: 'only_password' });
            expect(res2.statusCode).toBe(400);
            expect(res2.body.error).toBe('Usuario y contraseña son requeridos.');
        });

        test('POST /api/auth/admin/register - Debe fallar si el usuario ya existe', async () => {
            await Admin.create({ username: 'existing_admin', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/admin/register')
                .send({ username: 'existing_admin', password: 'password123' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('El nombre de usuario ya está registrado.');
        });

        test('POST /api/auth/register (alias) - Debe redireccionar a /api/auth/admin/register', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'alias_admin', password: 'password123' });

            expect(res.statusCode).toBe(307);
            expect(res.header.location).toBe('/api/auth/admin/register');
        });

        test('POST /api/auth/admin/register - Debe manejar errores internos de base de datos', async () => {
            const saveSpy = jest.spyOn(Admin.prototype, 'save').mockRejectedValueOnce(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .post('/api/auth/admin/register')
                .send({ username: 'error_admin', password: 'password123' });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('DB Error');

            saveSpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });

    describe('Admin Login', () => {
        beforeEach(async () => {
            await Admin.create({ username: 'admin_login_test', password: 'password123' });
        });

        test('POST /api/auth/admin/login - Debe iniciar sesión con credenciales correctas', async () => {
            const res = await request(app)
                .post('/api/auth/admin/login')
                .send({ username: 'admin_login_test', password: 'password123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe('admin_login_test');
            expect(res.body.role).toBe('admin');
            expect(res.header['set-cookie']).toBeDefined();
            expect(res.header['set-cookie'][0]).toContain('token=');
        });

        test('POST /api/auth/admin/login - Debe fallar si faltan campos', async () => {
            const res = await request(app)
                .post('/api/auth/admin/login')
                .send({ username: 'admin_login_test' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Usuario y contraseña son requeridos.');
        });

        test('POST /api/auth/admin/login - Debe fallar con usuario inexistente', async () => {
            const res = await request(app)
                .post('/api/auth/admin/login')
                .send({ username: 'wrong_admin', password: 'password123' });

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Credenciales inválidas.');
        });

        test('POST /api/auth/admin/login - Debe fallar con contraseña incorrecta', async () => {
            const res = await request(app)
                .post('/api/auth/admin/login')
                .send({ username: 'admin_login_test', password: 'wrongpassword' });

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Credenciales inválidas.');
        });

        test('POST /api/auth/login (alias) - Debe redireccionar a /api/auth/admin/login', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin_login_test', password: 'password123' });

            expect(res.statusCode).toBe(307);
            expect(res.header.location).toBe('/api/auth/admin/login');
        });

        test('POST /api/auth/admin/login - Debe manejar errores internos', async () => {
            const findSpy = jest.spyOn(Admin, 'findOne').mockRejectedValueOnce(new Error('Login DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .post('/api/auth/admin/login')
                .send({ username: 'admin_login_test', password: 'password123' });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Login DB Error');

            findSpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });

    describe('Elector Registration & Login', () => {
        test('POST /api/auth/elector/register - Debe registrar elector exitosamente', async () => {
            const res = await request(app)
                .post('/api/auth/elector/register')
                .send({ username: 'new_elector', password: 'password123' });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('Elector registrado exitosamente.');
            
            const savedElector = await Elector.findOne({ username: 'new_elector' });
            expect(savedElector).not.toBeNull();
        });

        test('POST /api/auth/elector/register - Debe fallar si el elector ya existe', async () => {
            await Elector.create({ username: 'existing_elector', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/elector/register')
                .send({ username: 'existing_elector', password: 'password123' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('El nombre de usuario ya está registrado.');
        });

        test('POST /api/auth/elector/register - Debe fallar si faltan campos', async () => {
            const res = await request(app)
                .post('/api/auth/elector/register')
                .send({ username: 'elector_only' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Usuario y contraseña son requeridos.');
        });

        test('POST /api/auth/elector/register - Debe manejar errores internos de base de datos', async () => {
            const saveSpy = jest.spyOn(Elector.prototype, 'save').mockRejectedValueOnce(new Error('Elector DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .post('/api/auth/elector/register')
                .send({ username: 'error_elector', password: 'password123' });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Elector DB Error');

            saveSpy.mockRestore();
            consoleSpy.mockRestore();
        });

        test('POST /api/auth/elector/login - Debe iniciar sesión con credenciales correctas', async () => {
            await Elector.create({ username: 'elector_login_test', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/elector/login')
                .send({ username: 'elector_login_test', password: 'password123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe('elector_login_test');
            expect(res.body.role).toBe('elector');
            expect(res.header['set-cookie']).toBeDefined();
        });

        test('POST /api/auth/elector/login - Debe fallar si faltan campos o credenciales inválidas', async () => {
            const res1 = await request(app)
                .post('/api/auth/elector/login')
                .send({ username: 'elector_login_test' });
            expect(res1.statusCode).toBe(400);

            const res2 = await request(app)
                .post('/api/auth/elector/login')
                .send({ username: 'non_existent_elector', password: 'password123' });
            expect(res2.statusCode).toBe(401);

            await Elector.create({ username: 'elector_login_test2', password: 'password123' });
            const res3 = await request(app)
                .post('/api/auth/elector/login')
                .send({ username: 'elector_login_test2', password: 'wrongpassword' });
            expect(res3.statusCode).toBe(401);
        });

        test('POST /api/auth/elector/login - Debe manejar errores internos', async () => {
            const findSpy = jest.spyOn(Elector, 'findOne').mockRejectedValueOnce(new Error('Elector Login DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .post('/api/auth/elector/login')
                .send({ username: 'elector_login_test', password: 'password123' });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Elector Login DB Error');

            findSpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });

    describe('Session verification & Logout', () => {
        let token;
        beforeEach(async () => {
            const elector = await Elector.create({ username: 'session_user', password: 'password123' });
            token = jwt.sign(
                { id: elector._id, username: elector.username, role: 'elector' },
                process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
                { expiresIn: '30m' }
            );
        });

        test('GET /api/auth/me - Debe verificar la sesión actual usando cookies', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', [`token=${token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe('session_user');
            expect(res.body.role).toBe('elector');
        });

        test('GET /api/auth/me - Debe verificar la sesión usando el Header Authorization Bearer', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe('session_user');
            expect(res.body.role).toBe('elector');
        });

        test('GET /api/auth/me - Debe fallar con 401 si no hay token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Acceso no autorizado. Token no proporcionado.');
        });

        test('GET /api/auth/me - Debe fallar con 401 si el token es inválido', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', ['token=invalid_token']);
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Token inválido o malformado.');
        });

        test('GET /api/auth/me - Debe fallar con 401 si el token expira', async () => {
            const expiredToken = jwt.sign(
                { username: 'session_user', role: 'elector' },
                process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
                { expiresIn: '0s' } // Expira inmediatamente
            );
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', [`token=${expiredToken}`]);
            
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('La sesión ha expirado. Por favor, inicie sesión nuevamente.');
            
            consoleSpy.mockRestore();
        });

        test('POST /api/auth/logout - Debe limpiar la cookie y cerrar sesión', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Sesión cerrada exitosamente.');
            expect(res.header['set-cookie'][0]).toContain('token=;');
        });
    });
});
