const express = require('express');
const router = express.Router();
const Candidato = require('../models/Candidato');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware de autorización: solo admins pueden escribir
const adminOnly = [authMiddleware, (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
}];

// POST: Crear un nuevo candidato (SOLO ADMIN)
router.post('/', adminOnly, async (req, res) => {
    const { nombre, partidoPolitico, fotoUrl, equipoTrabajo } = req.body;
    if (!nombre || nombre.trim().length < 2) {
        return res.status(400).json({ error: 'El campo nombre es requerido (mín. 2 caracteres).' });
    }
    if (fotoUrl) {
        try {
            const parsedUrl = new URL(fotoUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Protocolo inválido');
        } catch (error) {
            return res.status(400).json({ error: 'La URL de fotografía debe ser una dirección http/https válida.' });
        }
    }
    try {
        const nuevoCandidato = new Candidato({ 
            nombre: nombre.trim(), 
            partidoPolitico: partidoPolitico?.trim() || 'Independiente',
            fotoUrl: fotoUrl?.trim() || undefined,
            equipoTrabajo: Array.isArray(equipoTrabajo) ? equipoTrabajo : []
        });
        const candidatoGuardado = await nuevoCandidato.save();
        res.status(201).json(candidatoGuardado);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un candidato con ese nombre.' });
        }
        console.error("Error al guardar candidato:", error);
        res.status(500).json({ mensaje: 'Error al crear el candidato en la base de datos' });
    }
});

// GET: Listado liviano para el selector público de candidatos
router.get('/available', async (req, res) => {
    try {
        const candidatos = await Candidato.find()
            .sort({ nombre: 1 })
            .select('nombre partidoPolitico _id');
        res.json(candidatos);
    } catch (error) {
        console.error("Error al listar candidatos disponibles:", error);
        res.status(500).json({ error: 'No se pudo cargar la lista de candidatos.' });
    }
});

// GET: Buscar candidatos para el autocompletado (UH14)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 3) return res.json([]);
        
        const todosLosCandidatos = await Candidato.find().lean().select('nombre partidoPolitico _id');
        
        const Fuse = require('fuse.js');
        const fuse = new Fuse(todosLosCandidatos, {
            keys: ['nombre', 'partidoPolitico'],
            threshold: 0.4, // 0.0 es exacto, 1.0 es muy flexible. 0.4 es ideal para nombres mal escritos
            ignoreLocation: true
        });

        // Retornamos las 5 mejores coincidencias "fuzzy"
        const candidatos = fuse.search(q).map(result => result.item).slice(0, 5);
        res.json(candidatos);
    } catch (error) {
        console.error("Error en búsqueda:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener todos los candidatos de la base de datos
router.get('/', async (req, res) => {
    try {
        const listaCandidatos = await Candidato.find();
        res.status(200).json(listaCandidatos);
    } catch (error) {
        console.error("Error al obtener candidatos:", error);
        res.status(500).json({ mensaje: 'Error al obtener la información' });
    }
});

// GET: Obtener un candidato por ID
router.get('/:id', async (req, res) => {
    try {
        const candidato = await Candidato.findById(req.params.id);
        if (!candidato) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json(candidato);
    } catch (error) {
        console.error("Error al obtener detalle del candidato:", error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH: Editar datos básicos de un candidato (SOLO ADMIN)
router.patch('/:id', adminOnly, async (req, res) => {
    const { nombre, partidoPolitico, fotoUrl } = req.body;
    if (!nombre || nombre.trim().length < 2) {
        return res.status(400).json({ error: 'El campo nombre es requerido (mín. 2 caracteres).' });
    }
    if (fotoUrl) {
        try {
            const parsedUrl = new URL(fotoUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Protocolo inválido');
        } catch (error) {
            return res.status(400).json({ error: 'La URL de fotografía debe ser una dirección http/https válida.' });
        }
    }

    try {
        const candidato = await Candidato.findById(req.params.id);
        if (!candidato) return res.status(404).json({ error: 'Candidato no encontrado' });

        candidato.nombre = nombre.trim();
        candidato.partidoPolitico = partidoPolitico?.trim() || 'Independiente';
        candidato.fotoUrl = fotoUrl?.trim() || undefined;
        await candidato.save();
        res.json(candidato);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un candidato con ese nombre.' });
        }
        console.error('Error al editar candidato:', error);
        res.status(500).json({ error: 'No se pudo actualizar el candidato.' });
    }
});

// DELETE: Eliminar un candidato completo (SOLO ADMIN)
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const result = await Candidato.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json({ message: "Candidato eliminado exitosamente" });
    } catch (error) {
        console.error("Error al eliminar candidato:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar una noticia específica de un candidato (SOLO ADMIN)
router.delete('/:candidateId/news/:newsId', adminOnly, async (req, res) => {
    try {
        const { candidateId, newsId } = req.params;
        const result = await Candidato.findByIdAndUpdate(
            candidateId,
            { $pull: { historial_noticias: { _id: newsId } } },
            { returnDocument: 'after' }
        );
        if (!result) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json({ message: "Noticia eliminada exitosamente", candidate: result });
    } catch (error) {
        console.error("Error al eliminar noticia:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
