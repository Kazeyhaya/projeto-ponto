const pool = require('../db');

async function salvarAtestado(batidaId, colaboradorId, nomeArquivo, caminhoArquivo, observacao) {
    const result = await pool.query(
        `INSERT INTO atestados (batida_id, colaborador_id, arquivo_nome, arquivo_path, observacao)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [batidaId, colaboradorId, nomeArquivo, caminhoArquivo, observacao]
    );
    return result.rows[0];
}

async function listarAtestadosPorBatida(batidaId) {
    const result = await pool.query(
        `SELECT * FROM atestados WHERE batida_id = $1 ORDER BY data_upload DESC`,
        [batidaId]
    );
    return result.rows;
}

module.exports = { salvarAtestado, listarAtestadosPorBatida };