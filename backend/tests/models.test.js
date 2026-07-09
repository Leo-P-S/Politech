require('./setup');
const Admin = require('../models/Admin');
const Elector = require('../models/Elector');

describe('Pruebas Unitarias - Modelos de Datos', () => {
    
    describe('Admin Model', () => {
        test('Debe guardar un admin y encriptar su contraseña', async () => {
            const admin = new Admin({
                username: 'admin_test',
                password: 'super_secret_password'
            });
            
            await admin.save();
            
            expect(admin.username).toBe('admin_test');
            expect(admin.password).not.toBe('super_secret_password');
            expect(admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')).toBe(true);
        });

        test('Debe comparar contraseñas correctamente', async () => {
            const admin = new Admin({
                username: 'admin_test2',
                password: 'password123'
            });
            await admin.save();

            const isMatch = await admin.comparePassword('password123');
            const isNotMatch = await admin.comparePassword('wrongpassword');

            expect(isMatch).toBe(true);
            expect(isNotMatch).toBe(false);
        });

        test('No debe re-encriptar la contraseña si no ha sido modificada', async () => {
            const admin = new Admin({
                username: 'admin_test3',
                password: 'password123'
            });
            await admin.save();
            const originalHashedPassword = admin.password;

            // Modificamos otro campo (username) y guardamos
            admin.username = 'admin_test3_modificado';
            await admin.save();

            expect(admin.password).toBe(originalHashedPassword);
        });
    });

    describe('Elector Model', () => {
        test('Debe guardar un elector y encriptar su contraseña', async () => {
            const elector = new Elector({
                username: 'elector_test',
                password: 'elector_password'
            });
            
            await elector.save();
            
            expect(elector.username).toBe('elector_test');
            expect(elector.password).not.toBe('elector_password');
            expect(elector.password.startsWith('$2a$') || elector.password.startsWith('$2b$')).toBe(true);
        });

        test('Debe comparar contraseñas correctamente', async () => {
            const elector = new Elector({
                username: 'elector_test2',
                password: 'elector_password123'
            });
            await elector.save();

            const isMatch = await elector.comparePassword('elector_password123');
            const isNotMatch = await elector.comparePassword('wrong_password');

            expect(isMatch).toBe(true);
            expect(isNotMatch).toBe(false);
        });

        test('No debe re-encriptar la contraseña si no ha sido modificada', async () => {
            const elector = new Elector({
                username: 'elector_test3',
                password: 'elector_password123'
            });
            await elector.save();
            const originalHashedPassword = elector.password;

            // Modificamos otro campo y guardamos
            elector.username = 'elector_test3_modificado';
            await elector.save();

            expect(elector.password).toBe(originalHashedPassword);
        });
    });
});
