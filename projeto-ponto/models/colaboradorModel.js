const pool = require('../db');

// A função nova Só faz o INSERT.
async function createColaborador(nome, email) {
  const result = await pool.query(
    'INSERT INTO colaboradores (nome, email) VALUES ($1, $2) RETURNING id',
    [nome, email]
  );
  return result.rows[0].id;
}

async function listarColaboradores() {
  const result = await pool.query('SELECT id, nome, email FROM colaboradores ORDER BY nome');
  return result.rows;
}


module.exports = { createColaborador, listarColaboradores };