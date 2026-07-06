const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/atestados');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `atestado_${req.params.id}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

async function listarColaboradores(req, res) {
  try {
    const result = await pool.query(`SELECT id, nome, email FROM colaboradores ORDER BY nome ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar colaboradores' });
  }
}

async function buscarColaboradorPorId(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT id, nome, email FROM colaboradores WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar colaborador' });
  }
}

async function relatorioBatidasUnificadas(req, res) {
  const { colaborador_id, inicio, fim } = req.query; 
  try {
    const result = await pool.query(`
      SELECT 
        date_trunc('day', data_hora) as data_dia,
        MAX(CASE WHEN TRIM(LOWER(tipo_batida)) = 'entrada' THEN data_hora END) as entrada,
        MAX(CASE WHEN TRIM(LOWER(tipo_batida)) = 'almoco' THEN data_hora END) as almoco,
        MAX(CASE WHEN TRIM(LOWER(tipo_batida)) = 'retorno' THEN data_hora END) as retorno,
        MAX(CASE WHEN TRIM(LOWER(tipo_batida)) = 'saida' THEN data_hora END) as saida
      FROM batidas_ponto
      WHERE colaborador_id = $1 
        AND data_hora::date BETWEEN $2 AND $3
      GROUP BY data_dia
      ORDER BY data_dia DESC
    `, [colaborador_id, inicio, fim]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório unificado' });
  }
}

async function atualizarPontoConsolidado(req, res) {
  const { colaborador_id, data_dia, entrada, almoco, retorno, saida } = req.body;
  try {
    const tipos = [
      { tipo: 'entrada', valor: entrada },
      { tipo: 'almoco',  valor: almoco },
      { tipo: 'retorno', valor: retorno },
      { tipo: 'saida',   valor: saida }
    ];

    for (const item of tipos) {
      if (item.valor) {
        await pool.query(`
          UPDATE batidas_ponto 
          SET data_hora = $1 
          WHERE colaborador_id = $2 
            AND data_hora::date = $3 
            AND TRIM(LOWER(tipo_batida)) = $4
        `, [item.valor, colaborador_id, data_dia, item.tipo]);
      }
    }
    res.json({ mensagem: 'Dia de ponto atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar os registros' });
  }
}

async function editarBatida(req, res) {
  const { id } = req.params;
  const { tipo_batida, data_hora, localizacao } = req.body;
  try {
    const result = await pool.query(
      `UPDATE batidas_ponto
       SET tipo_batida = COALESCE($1, tipo_batida),
           data_hora = COALESCE($2, data_hora),
           localizacao = COALESCE($3, localizacao)
       WHERE id = $4
       RETURNING *`,
      [tipo_batida, data_hora, localizacao, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar batida' });
  }
}

async function excluirBatida(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM batidas_ponto WHERE id = $1', [id]);
    res.json({ mensagem: 'Batida excluída' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir' });
  }
}

async function anexarAtestado(req, res) {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  res.json({ mensagem: 'Sucesso', arquivo: req.file.filename });
}

const uploadMiddleware = upload.single('atestado');

module.exports = {
  listarColaboradores,
  buscarColaboradorPorId,
  relatorioBatidasUnificadas,
  atualizarPontoConsolidado,
  editarBatida,
  excluirBatida,
  anexarAtestado,
  uploadMiddleware
};