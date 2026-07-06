const userModel = require('../models/userModel');
const colaboradorModel = require('../models/colaboradorModel');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const pool = require('../db'); // ✅ ADICIONADO: Para garantir a busca no refresh
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secreta_acesso';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'secreta_renovacao';

// --- FUNÇÃO DE LOGIN ---
async function login(req, res) {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
  const { senha } = req.body;

  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });

  try {
    const usuario = await userModel.getUserByEmail(email);
    if (!usuario) return res.status(401).json({ erro: 'E-mail não encontrado.' });

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'Senha incorreta.' });

    const accessToken = jwt.sign(
      { id: usuario.id, colaborador_id: usuario.colaborador_id, nome: usuario.nome, role: usuario.role || 'user' },
      JWT_SECRET,
      { expiresIn: '15m' } 
    );

    const refreshToken = jwt.sign(
      { id: usuario.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.clearCookie('token');

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,  
      secure: false,   
      sameSite: 'strict', 
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.json({
      mensagem: 'Login realizado com sucesso!',
      accessToken: accessToken, 
      usuario: { nome: usuario.nome, role: usuario.role || 'user' }
    });
  } catch (err) {
    console.error('❌ Erro no login:', err.message);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}

// --- FUNÇÃO DE REGISTRO ---
async function register(req, res) {
  // (Mantido exatamente como o seu original)
  const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
  const nome = req.body.nome ? req.body.nome.trim() : null;
  const { senha } = req.body;

  if (!email || !senha || !nome) return res.status(400).json({ erro: 'Campos obrigatórios' });

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve conter pelo menos 6 caracteres.' });
}

  try {
    const existe = await userModel.userExists(email);
    if (existe) return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });

    const colaboradorId = await colaboradorModel.createColaborador(nome, email);
    await userModel.createUser(colaboradorId, email, senha);

    res.status(201).json({ mensagem: 'Conta criada com sucesso! Faça login.' });
  } catch (err) {
    console.error('❌ ERRO NO REGISTRO:', err.message);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}

// --- 🔄 NOVA: FUNÇÃO DE REFRESH ---
async function refresh(req, res) {
  const refreshToken = req.cookies.refreshToken; // Precisa do cookie-parser no index.js!
  
  if (!refreshToken) return res.status(401).json({ erro: 'Acesso negado. Nenhum token encontrado.' });

  try {
    const decodificado = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Busca o usuário direto no banco para garantir que ele ainda existe e pegar o nome/role
    const result = await pool.query(`
      SELECT u.id, u.colaborador_id, c.nome, u.role 
      FROM usuarios u 
      JOIN colaboradores c ON u.colaborador_id = c.id 
      WHERE u.id = $1
    `, [decodificado.id]);

    const usuario = result.rows[0];
    if (!usuario) return res.status(403).json({ erro: 'Usuário não existe mais.' });

    // Gera a pulseira nova de 15 minutos
    const accessToken = jwt.sign(
      { id: usuario.id, colaborador_id: usuario.colaborador_id, nome: usuario.nome, role: usuario.role || 'user' },
      JWT_SECRET,
      { expiresIn: '15m' } 
    );

    res.json({ accessToken: accessToken });
  } catch (err) {
    console.error('❌ Erro na renovação:', err.message);
    res.clearCookie('refreshToken'); // Se o token for falso ou velho, destrói!
    return res.status(403).json({ erro: 'Refresh token inválido. Faça login.' });
  }
}

// --- 🚪 NOVA: FUNÇÃO DE LOGOUT ---
async function logout(req, res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'strict'
  });
  res.json({ mensagem: 'Sessão encerrada com segurança.' });
}

module.exports = {
  login,
  register,
  refresh,
  logout
};