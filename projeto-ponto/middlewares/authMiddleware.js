const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Configuração de fuso horário para o reset de meia-noite
dayjs.extend(utc);
dayjs.extend(timezone);

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secreta_acesso';
const FUSO_HORARIO = 'America/Fortaleza';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido. Acesso negado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ erro: 'Sessão expirada ou token inválido.' });
    }

    // Lógica de reset automático às 00:00
    const inicioDoDiaAtual = dayjs().tz(FUSO_HORARIO).startOf('day').unix();
    
    // Se o token foi emitido antes das 00:00 de hoje, ele é invalidado
    if (user.iat < inicioDoDiaAtual) {
      return res.status(401).json({ erro: 'Sessão finalizada pelo reset diário. Faça login novamente.' });
    }

    req.user = user;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  // Verifica se o usuário autenticado possui a role necessária
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado. Requer privilégios de administrador.' });
  }
  next();
}

module.exports = { authenticateToken, authorizeAdmin };