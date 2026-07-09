const express = require('express');
const router = express.Router();
const Candidato = require('../models/Candidato');

// POST: Crear un nuevo candidato en la base de datos
router.post('/', async (req, res) => {
    try {
        const nuevoCandidato = new Candidato(req.body);
        const candidatoGuardado = await nuevoCandidato.save();
        res.status(201).json(candidatoGuardado);
    } catch (error) {
        console.error("Error al guardar candidato:", error);
        res.status(500).json({ mensaje: 'Error al crear el candidato en la base de datos' });
    }
});

// GET: Buscar candidatos para el autocompletado (UH14)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 3) return res.json([]);
        
        const candidatos = await Candidato.find({
            $or: [
                { nombre: { $regex: q, $options: 'i' } },
                { partidoPolitico: { $regex: q, $options: 'i' } }
            ]
        }).limit(5).select('nombre partidoPolitico _id');
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

// DELETE: Eliminar un candidato completo
router.delete('/:id', async (req, res) => {
    try {
        const result = await Candidato.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Candidato no encontrado" });
        res.json({ message: "Candidato eliminado exitosamente" });
    } catch (error) {
        console.error("Error al eliminar candidato:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar una noticia específica de un candidato
router.delete('/:candidateId/news/:newsId', async (req, res) => {
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