const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// O console.log ajuda a ver se o controller carregou certo (apague depois de testar)
console.log('Conteúdo do authController:', authController);

// 1. Mapeia as rotas usando as funções que vêm do controller
router.post('/login', authController.login);
router.post('/register', authController.register);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;