const validateCandidate = (req, res, next) => {

    const { nombre, partido } = req.body;

    // Validar nombre
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            message: 'El nombre del candidato es obligatorio.'
        });
    }

    // Longitud mínima
    if (nombre.trim().length < 3) {
        return res.status(400).json({
            message: 'El nombre debe tener al menos 3 caracteres.'
        });
    }

    // Longitud máxima
    if (nombre.length > 100) {
        return res.status(400).json({
            message: 'El nombre es demasiado largo.'
        });
    }

    // Partido (si existe)
    if (partido && partido.length > 100) {
        return res.status(400).json({
            message: 'El nombre del partido es demasiado largo.'
        });
    }

    next();
};

module.exports = validateCandidate;