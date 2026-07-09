const express = require('express');
const router = express.Router();
const Elector = require('../models/Elector');
const Candidato = require('../models/Candidato');
const authMiddleware = require('../middlewares/auth.middleware');

// Asegurar que todas las rutas requieran autenticación de Elector
router.use(authMiddleware);
router.use((req, res, next) => {
    if (req.user.role !== 'elector') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere cuenta de elector.' });
    }
    next();
});

// GET: Obtener búsquedas recientes (UH09)
router.get('/searches', async (req, res) => {
    try {
        const elector = await Elector.findById(req.user.id);
        if (!elector) return res.status(404).json({ error: 'Elector no encontrado' });
        res.json(elector.recentSearches || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Registrar una nueva búsqueda (UH09)
router.post('/searches', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'La consulta no puede estar vacía.' });
        }

        const elector = await Elector.findById(req.user.id);
        if (!elector) return res.status(404).json({ error: 'Elector no encontrado' });

        // Evitar duplicados consecutivos y mantener un límite de 10 búsquedas
        let searches = elector.recentSearches || [];
        searches = searches.filter(s => s !== query);
        searches.unshift(query);
        if (searches.length > 10) searches.pop();

        elector.recentSearches = searches;
        await elector.save();

        res.json(elector.recentSearches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Suscribirse a las alertas de un candidato (UH21, UH22)
router.post('/alerts/subscribe', async (req, res) => {
    try {
        const { candidatoId } = req.body;
        if (!candidatoId) {
            return res.status(400).json({ error: 'candidatoId es requerido' });
        }

        const candidato = await Candidato.findById(candidatoId);
        if (!candidato) return res.status(404).json({ error: 'Candidato no encontrado' });

        const elector = await Elector.findById(req.user.id);
        if (!elector) return res.status(404).json({ error: 'Elector no encontrado' });

        if (!elector.alertSubscriptions.includes(candidatoId)) {
            elector.alertSubscriptions.push(candidatoId);
            await elector.save();
        }

        res.json({ message: `Suscrito a las alertas de ${candidato.nombre} con éxito.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener las alertas de candidatos suscritos (UH13, UH21, UH22)
router.get('/alerts', async (req, res) => {
    try {
        const elector = await Elector.findById(req.user.id).populate('alertSubscriptions');
        if (!elector) return res.status(404).json({ error: 'Elector no encontrado' });

        // Formatear alertas de todos los candidatos suscritos
        const alertsList = [];
        elector.alertSubscriptions.forEach(candidato => {
            if (candidato.antecedentesJudiciales && candidato.antecedentesJudiciales.length > 0) {
                candidato.antecedentesJudiciales.forEach(ante => {
                    alertsList.push({
                        candidatoId: candidato._id,
                        nombreCandidato: candidato.nombre,
                        nivel: ante.toLowerCase().includes('corrupción') || ante.toLowerCase().includes('graves') ? 'Alto' : 'Medio',
                        mensaje: ante
                    });
                });
            }
        });

        res.json(alertsList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
