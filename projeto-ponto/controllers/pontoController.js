const pool = require('../db');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const ordemTipos = {
  null: 'entrada',
  entrada: 'almoco',
  almoco: 'retorno',
  retorno: 'saida',
  saida: null
};

const FUSO_HORARIO = 'America/Fortaleza';

// Helper para ordenacao por hierarquia logica
const SQL_ORDEM_FIXA = `
  ORDER BY 
    CASE 
      WHEN TRIM(LOWER(tipo_batida)) = 'entrada' THEN 1
      WHEN TRIM(LOWER(tipo_batida)) = 'almoco'  THEN 2
      WHEN TRIM(LOWER(tipo_batida)) = 'retorno' THEN 3
      WHEN TRIM(LOWER(tipo_batida)) = 'saida'   THEN 4
      ELSE 5
    END
`;

async function getProximoTipo(req, res) {
  const colaboradorId = req.user.colaborador_id; 
  try {
    const hojePiaui = dayjs().tz(FUSO_HORARIO).format('YYYY-MM-DD');

    // MANTIDO DESC: Busca o estagio mais alto para definir o proximo
    const query = `
      SELECT tipo_batida
      FROM batidas_ponto
      WHERE colaborador_id = $1 AND DATE(data_hora) = $2
      ${SQL_ORDEM_FIXA} DESC
      LIMIT 1;
    `;
    const resultado = await pool.query(query, [colaboradorId, hojePiaui]);
    const ultimoTipo = resultado.rows[0] ? resultado.rows[0].tipo_batida : null;

    const proximoTipo = ordemTipos[ultimoTipo];
    res.json({ proximo_tipo: proximoTipo });
  } catch (err) {
    console.error('Erro ao obter proximo tipo:', err.message);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}

async function baterPonto(req, res) {
  const colaboradorId = req.user.colaborador_id; 
  const colaboradorNome = req.user.nome || '';
  let { localizacao } = req.body;

  try {
    if (!colaboradorId) return res.status(401).json({ erro: 'Token invalido.' });

    const hojePiaui = dayjs().tz(FUSO_HORARIO).format('YYYY-MM-DD');

    // MANTIDO DESC: Verifica o ponto mais "avancado" para validar a sequencia
    const queryUltimo = `
      SELECT tipo_batida
      FROM batidas_ponto
      WHERE colaborador_id = $1 AND DATE(data_hora) = $2
      ${SQL_ORDEM_FIXA} DESC
      LIMIT 1;
    `;
    const resultUltimo = await pool.query(queryUltimo, [colaboradorId, hojePiaui]);
    const ultimoTipo = resultUltimo.rows[0] ? resultUltimo.rows[0].tipo_batida : null;

    const proximoTipo = ordemTipos[ultimoTipo];

    if (!proximoTipo) {
      return res.status(400).json({ erro: 'Todas as batidas do dia ja foram realizadas' });
    }

    if (!localizacao) localizacao = 'Localizacao registrada pelo sistema';

    const dataHoraExata = dayjs().tz(FUSO_HORARIO).format();

    const query = `
      INSERT INTO batidas_ponto (colaborador_id, colaborador_nome, tipo_batida, localizacao, data_hora)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const values = [colaboradorId, colaboradorNome, proximoTipo, localizacao, dataHoraExata];
    const resultado = await pool.query(query, values);

    res.status(201).json({
      mensagem: 'Ponto registrado com sucesso!',
      dados: resultado.rows[0]
    });
  } catch (err) {
    console.error('Erro ao gravar no banco:', err.message);
    res.status(500).json({ erro: 'Erro interno ao salvar o ponto' });
  }
}

async function getPontosHoje(req, res) {
  const colaboradorId = req.user.colaborador_id; 
  try {
    const hojePiaui = dayjs().tz(FUSO_HORARIO).format('YYYY-MM-DD');

    // AJUSTADO ASC: Garante Entrada no topo e Saida na base
    const query = `
      SELECT b.colaborador_nome AS nome, b.tipo_batida, b.data_hora, b.localizacao
      FROM batidas_ponto b
      WHERE b.colaborador_id = $1 AND DATE(b.data_hora) = $2
      ${SQL_ORDEM_FIXA} ASC;
    `;
    const resultado = await pool.query(query, [colaboradorId, hojePiaui]);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar pontos:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar dados do banco' });
  }
}

module.exports = { getProximoTipo, baterPonto, getPontosHoje };