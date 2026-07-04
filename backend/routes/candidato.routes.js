const express = require('express');
const router = express.Router();
// Apuntamos al modelo oficial en inglés
const Candidate = require('../models/Candidate'); 

// POST: Crear un nuevo candidato en la base de datos
router.post('/', async (req, res) => {
    try {
        const nuevoCandidato = new Candidate(req.body);
        const candidatoGuardado = await nuevoCandidato.save();
        res.status(201).json(candidatoGuardado);
    } catch (error) {
        console.error("Error al guardar candidato:", error);
        res.status(500).json({ mensaje: 'Error al crear el candidato en la base de datos' });
    }
});

// GET: Obtener todos los candidatos
router.get('/', async (req, res) => {
    try {
        const listaCandidatos = await Candidate.find();
        res.status(200).json(listaCandidatos);
    } catch (error) {
        console.error("Error al obtener candidatos:", error);
        res.status(500).json({ mensaje: 'Error al obtener la información' });
    }
});

module.exports = router;