// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const pool = require('./db');
const rateLimit = require('express-rate-limit');

// Importação das rotas de API
const authRoutes = require('./routes/authRoutes');
const pontoRoutes = require('./routes/pontoRoutes');
const colaboradorRoutes = require('./routes/colaboradorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5435;

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'secreta_renovacao';

// --- MIDDLEWARES GLOBAIS ---
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Limite de requisições para segurança
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

// --- 🛡️ MIDDLEWARE DE PROTEÇÃO DE TELAS (HTML) ---
const protectHtml = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken; 

  if (!refreshToken) return res.redirect('/login'); 

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT role FROM usuarios WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) throw new Error('Usuário inexistente');

    req.userRole = result.rows[0].role; 
    next(); 
  } catch (err) {
    res.clearCookie('refreshToken'); 
    return res.redirect('/login');
  }
};

// --- ROTAS DA API (DEVOLVEM JSON) ---
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/ponto', pontoRoutes);
app.use('/api/colaborador', colaboradorRoutes);
app.use('/api/admin', adminRoutes);

// --- ROTAS DE NAVEGAÇÃO PROTEGIDAS (ENTREGAM HTML) ---

// Dashboard do funcionário comum
app.get('/dashboard', protectHtml, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Tela Principal do Admin (Lista de Colaboradores)
app.get('/admin', protectHtml, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).send('Acesso negado: Você não é administrador.');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ✅ NOVO: Tela de Relatórios Individuais (A que estava dando erro!)
app.get('/relatorios', protectHtml, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).send('Acesso negado: Somente administradores acessam relatórios.');
  }
  res.sendFile(path.join(__dirname, 'public', 'relatorios.html'));
});

// --- ROTA DE LOGIN E REDIRECIONAMENTO INTELIGENTE ---
app.get(['/', '/login'], async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT role FROM usuarios WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) throw new Error('Usuário inválido');

    const role = result.rows[0].role;
    return role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
  } catch (err) {
    res.clearCookie('refreshToken');
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Health check para monitoramento
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'conectado' });
  } catch (err) {
    res.status(500).json({ status: 'erro', database: 'indisponível' });
  }
});

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor voando na porta ${PORT}`);
  console.log(`📍 Interface: http://localhost:${PORT}/login\n`);
});