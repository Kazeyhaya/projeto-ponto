const pool = require('../db');

async function getUltimaBatidaDoDia(colaboradorId) {
  const result = await pool.query(
    `SELECT tipo_batida
     FROM batidas_ponto
     WHERE colaborador_id = $1 AND DATE(data_hora) = CURRENT_DATE
     ORDER BY data_hora DESC
     LIMIT 1`,
    [colaboradorId]
  );
  return result.rows[0] ? result.rows[0].tipo_batida : null;
}

async function registrarBatida(colaboradorId, colaboradorNome, tipoBatida, localizacao) {
  const result = await pool.query(
    `INSERT INTO batidas_ponto (colaborador_id, colaborador_nome, tipo_batida, localizacao)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [colaboradorId, colaboradorNome, tipoBatida, localizacao]
  );
  return result.rows[0];
}

async function getBatidasHoje() {
  const result = await pool.query(
    `SELECT colaborador_nome AS nome, tipo_batida, data_hora::time AS hora, localizacao
     FROM batidas_ponto
     WHERE DATE(data_hora) = CURRENT_DATE
     ORDER BY data_hora DESC`
  );
  return result.rows;
}

module.exports = { getUltimaBatidaDoDia, registrarBatida, getBatidasHoje };