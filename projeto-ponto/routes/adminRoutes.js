const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/colaboradores', authenticateToken, authorizeAdmin, adminController.listarColaboradores);
router.get('/colaborador/:id', authenticateToken, authorizeAdmin, adminController.buscarColaboradorPorId);
router.put('/batidas/:id', authenticateToken, authorizeAdmin, adminController.editarBatida);
router.delete('/batidas/:id', authenticateToken, authorizeAdmin, adminController.excluirBatida);
router.post('/batidas/:id/anexar', authenticateToken, authorizeAdmin, adminController.uploadMiddleware, adminController.anexarAtestado);
router.get('/relatorio/batidas', authenticateToken, authorizeAdmin, adminController.relatorioBatidasUnificadas);
router.put('/relatorio/atualizar', authenticateToken, authorizeAdmin, adminController.atualizarPontoConsolidado);

module.exports = router;