const express = require('express');
const router = express.Router();
const colaboradorController = require('../controllers/colaboradorController');
const { authenticateToken } = require('../middlewares/authMiddleware');



router.get('/', authenticateToken, colaboradorController.listarColaboradores);

module.exports = router;