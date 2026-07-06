const colaboradorModel = require('../models/colaboradorModel');

async function listarColaboradores(req, res) {
  try {
    const colaboradores = await colaboradorModel.listarColaboradores();
    res.json(colaboradores);
  } catch (err) {
    console.error('❌ Erro ao buscar colaboradores:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar colaboradores' });
  }
}

async function atualizarColaborador(req, res) {
  const { id } = req.params;
  const { nome, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE colaboradores SET nome = COALESCE($1, nome), email = COALESCE($2, email) WHERE id = $3 RETURNING *',
      [nome, email, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
}

async function excluirColaborador(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM batidas_ponto WHERE colaborador_id = $1', [id]);
    const result = await pool.query('DELETE FROM colaboradores WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Colaborador não encontrado' });
    res.json({ mensagem: 'Colaborador excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir' });
  }
}

module.exports = { listarColaboradores };