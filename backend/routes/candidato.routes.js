const express = require('express');
const router = express.Router();
const Candidato = require('../models/Candidato'); // Importamos el modelo que creaste

// POST: Crear un nuevo candidato en la base de datos
router.post('/', async (req, res) => {
    try {
        // req.body contiene la información que enviará el frontend o el scraper
        const nuevoCandidato = new Candidato(req.body);
        
        // Guardamos en MongoDB
        const candidatoGuardado = await nuevoCandidato.save();
        
        // Respondemos al frontend con el candidato recién creado
        res.status(201).json(candidatoGuardado);
    } catch (error) {
        console.error("Error al guardar candidato:", error);
        res.status(500).json({ mensaje: 'Error al crear el candidato en la base de datos' });
    }
});

// GET: Obtener todos los candidatos de la base de datos
router.get('/', async (req, res) => {
    try {
        // Busca todos los documentos en la colección 'candidatos'
        const listaCandidatos = await Candidato.find();
        
        // Envía la lista al frontend
        res.status(200).json(listaCandidatos);
    } catch (error) {
        console.error("Error al obtener candidatos:", error);
        res.status(500).json({ mensaje: 'Error al obtener la información' });
    }
});

module.exports = router;