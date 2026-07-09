const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        
        // Fallback para clientes que aún envían el header Authorization
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
        }
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
