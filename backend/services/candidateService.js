const Candidate = require('../models/Candidate');

const getAllCandidates = async () => {
  return await Candidate.find().sort({ createdAt: -1 });
};

const createCandidate = async (data) => {
  return await Candidate.create({
    nombre: data.nombre,
    partido: data.partido,
    historial_noticias: data.historial_noticias || []
  });
};

const getCandidateById = async (id) => {
  return await Candidate.findById(id);
};

const searchCandidatesByName = async (nombre) => {
  return await Candidate.find({
    nombre: { $regex: nombre, $options: 'i' }
  });
};

const deleteCandidateById = async (id) => {
  return await Candidate.findByIdAndDelete(id);
};

module.exports = {
  getAllCandidates,
  createCandidate,
  getCandidateById,
  searchCandidatesByName,
  deleteCandidateById
};  