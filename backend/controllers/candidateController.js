const candidateService = require('../services/candidateService');

const getAllCandidates = async (req, res) => {
  try {
    const candidates = await candidateService.getAllCandidates();
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener candidatos', error: error.message });
  }
};

const createCandidate = async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El campo nombre es obligatorio' });
    }

    const candidate = await candidateService.createCandidate(req.body);
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear candidato', error: error.message });
  }
};

const getCandidateById = async (req, res) => {
  try {
    const candidate = await candidateService.getCandidateById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidato no encontrado' });
    }

    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener candidato', error: error.message });
  }
};

const searchCandidatesByName = async (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ message: 'El parámetro nombre es obligatorio' });
    }

    const candidates = await candidateService.searchCandidatesByName(nombre);
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar candidatos', error: error.message });
  }
};

const deleteCandidateById = async (req, res) => {
  try {
    const candidate = await candidateService.deleteCandidateById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidato no encontrado' });
    }

    res.status(200).json({ message: 'Candidato eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar candidato', error: error.message });
  }
};

module.exports = {
  getAllCandidates,
  createCandidate,
  getCandidateById,
  searchCandidatesByName,
  deleteCandidateById
};