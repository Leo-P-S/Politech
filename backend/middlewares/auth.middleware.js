const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev');

        // Adjuntar datos del usuario decodificados (id, username, role) a la petición
        req.user = decoded;
        req.admin = decoded; // Retrocompatibilidad con código existente
        next();
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.' });
        }
        return res.status(401).json({ error: 'Token inválido o malformado.' });
    }
};
