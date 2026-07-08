const express = require('express');
const router = express.Router();
const Candidato = require('../models/Candidato');

// POST: Crear un nuevo candidato en la base de datos
router.post('/', async (req, res) => {
    try {
        // En caso de que el cuerpo venga con 'nombre' y 'partidoPolitico'
        const nuevoCandidato = new Candidato(req.body);
        const candidatoGuardado = await nuevoCandidato.save();
        res.status(201).json(candidatoGuardado);
    } catch (error) {
        console.error("Error al guardar candidato:", error);
        res.status(500).json({ mensaje: 'Error al crear el candidato en la base de datos' });
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