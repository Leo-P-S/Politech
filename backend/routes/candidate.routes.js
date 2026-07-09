const express = require('express');
const router = express.Router();

const candidateController = require('../controllers/candidateController');
const validateCandidate = require('../middleware/validateCandidate');

router.get('/', candidateController.getAllCandidates);
router.post(
    '/',
    validateCandidate,
    candidateController.createCandidate
);
router.get('/search', candidateController.searchCandidatesByName);
router.get('/:id', candidateController.getCandidateById);
router.delete('/:id', candidateController.deleteCandidateById);

module.exports = router;