const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Elector = require('../models/Elector');

// POST: Registrar un administrador (Para propósitos de configuración inicial en dev)
router.post('/admin/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
        }

        const adminExistente = await Admin.findOne({ username });
        if (adminExistente) {
            return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
        }

        const nuevoAdmin = new Admin({ username, password });
        await nuevoAdmin.save();

        res.status(201).json({ message: 'Administrador registrado exitosamente.' });
    } catch (error) {
        console.error('Error al registrar admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alias compatible para registro de admin
router.post('/register', async (req, res) => {
    res.redirect(307, '/api/auth/admin/register');
});

// POST: Autenticación del Administrador (Login)
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const esValido = await admin.comparePassword(password);
        if (!esValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Crear token JWT con expiración de 30 minutos (RNF10)
        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 60 * 1000 // 30 min
        });

        res.json({
            username: admin.username,
            role: 'admin',
            expiresIn: '30m'
        });
    } catch (error) {
        console.error('Error en login admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alias compatible para login de admin
router.post('/login', async (req, res) => {
    res.redirect(307, '/api/auth/admin/login');
});

// POST: Registrar un elector
router.post('/elector/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
        }

        const electorExistente = await Elector.findOne({ username });
        if (electorExistente) {
            return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
        }

        const nuevoElector = new Elector({ username, password });
        await nuevoElector.save();

        res.status(201).json({ message: 'Elector registrado exitosamente.' });
    } catch (error) {
        console.error('Error al registrar elector:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Autenticación del Elector (Login)
router.post('/elector/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
        }

        const elector = await Elector.findOne({ username });
        if (!elector) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const esValido = await elector.comparePassword(password);
        if (!esValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Crear token JWT con expiración de 30 minutos (RNF10)
        const token = jwt.sign(
            { id: elector._id, username: elector.username, role: 'elector' },
            process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
            { expiresIn: '30m' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 60 * 1000 // 30 min
        });

        res.json({
            username: elector.username,
            role: 'elector',
            expiresIn: '30m'
        });
    } catch (error) {
        console.error('Error en login elector:', error);
        res.status(500).json({ error: error.message });
    }
});

const authMiddleware = require('../middlewares/auth.middleware');

// GET: Validar sesión actual
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        username: req.user.username,
        role: req.user.role
    });
});

// POST: Cerrar sesión (Logout)
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Sesión cerrada exitosamente.' });
});

module.exports = router;
