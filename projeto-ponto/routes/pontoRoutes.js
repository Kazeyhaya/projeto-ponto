const express = require('express');
const router = express.Router();
const pontoController = require('../controllers/pontoController');
const { authenticateToken } = require('../middlewares/authMiddleware'); 

router.get('/proximo-tipo', authenticateToken, pontoController.getProximoTipo);
router.post('/bater-ponto', authenticateToken, pontoController.baterPonto);
router.get('/pontos-hoje', authenticateToken, pontoController.getPontosHoje);

module.exports = router;