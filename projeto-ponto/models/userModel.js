const pool = require('../db');
const bcrypt = require('bcryptjs');

async function userExists(email) {
  const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  return result.rows.length > 0;
}

// Mantivemos a versão correta, passando o role para bater com o banco novo
async function createUser(colaboradorId, email, senha, role = 'user') {
  const senhaHash = await bcrypt.hash(senha, 10);
  await pool.query(
    'INSERT INTO usuarios (colaborador_id, email, senha_hash, role) VALUES ($1, $2, $3, $4)',
    [colaboradorId, email, senhaHash, role]
  );
}

// Uma única versão limpa do GetUser
async function getUserByEmail(email) {
  const result = await pool.query(
    `SELECT u.*, c.nome
     FROM usuarios u
     JOIN colaboradores c ON u.colaborador_id = c.id
     WHERE u.email = $1`,
    [email]
  );
  return result.rows[0];
}

module.exports = { getUserByEmail, userExists, createUser };