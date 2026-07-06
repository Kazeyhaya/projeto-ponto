const pool = require('../db');

// --- 1. RELATÓRIO DE HORAS TOTAIS (Para o Gráfico de Barras) ---
async function getHorasTrabalhadasPorColaborador(req, res) {
  const { mes, ano } = req.query;

  if (!mes || !ano) {
    return res.status(400).json({ erro: 'Mês e ano são obrigatórios' });
  }

  // Define o primeiro e o último dia do mês pesquisado
  const dataInicio = `${ano}-${mes.padStart(2, '0')}-01 00:00:00`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${mes.padStart(2, '0')}-${ultimoDia} 23:59:59`;

  try {
    // Busca as batidas de todo mundo no mês
    const query = `
      SELECT b.data_hora, b.tipo_batida, b.colaborador_id, c.nome
      FROM batidas_ponto b
      JOIN colaboradores c ON b.colaborador_id = c.id
      WHERE b.data_hora >= $1 AND b.data_hora <= $2
      ORDER BY b.colaborador_id, b.data_hora ASC
    `;
    
    const result = await pool.query(query, [dataInicio, dataFim]);
    const batidas = result.rows;

    // Agrupa e calcula as horas de cada funcionário no Back-end
    const relatorio = {};

    batidas.forEach(b => {
      // Cria o espaço do funcionário se não existir
      if (!relatorio[b.colaborador_id]) {
        relatorio[b.colaborador_id] = { nome: b.nome, msTrabalhados: 0, inicioPeriodo: null };
      }
      
      const colab = relatorio[b.colaborador_id];
      const hora = new Date(b.data_hora);

      if (b.tipo_batida === 'entrada' || b.tipo_batida === 'retorno') {
        colab.inicioPeriodo = hora;
      } else if ((b.tipo_batida === 'almoco' || b.tipo_batida === 'saida') && colab.inicioPeriodo) {
        colab.msTrabalhados += (hora - colab.inicioPeriodo);
        colab.inicioPeriodo = null;
      }
    });

    // Formata o resultado para o Front-end ler como 'HH:MM:SS'
    const dadosFinais = Object.values(relatorio).map(colab => {
      const totalSegundos = Math.floor(colab.msTrabalhados / 1000);
      const h = Math.floor(totalSegundos / 3600);
      const m = Math.floor((totalSegundos % 3600) / 60);
      const s = totalSegundos % 60;
      
      const formatoHora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      
      return { nome: colab.nome, total_horas: formatoHora };
    });

    res.json(dadosFinais);
  } catch (err) {
    console.error('❌ Erro no relatório de horas:', err.message);
    res.status(500).json({ erro: 'Erro interno ao calcular horas' });
  }
}

// --- 2. RELATÓRIO DE BATIDAS FILTRADAS (Para a Tabela do Admin) ---
async function getBatidasFiltradas(req, res) {
  // Puxa exatamente os nomes que o admin.js está mandando na URL
  const { colaborador_id, inicio, fim } = req.query; 
  
  // O truque do WHERE 1=1 para concatenar os filtros dinamicamente
  let query = `
    SELECT b.*, c.nome as colaborador_nome, c.email as colaborador_email
    FROM batidas_ponto b
    JOIN colaboradores c ON b.colaborador_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (colaborador_id) {
    params.push(colaborador_id);
    query += ` AND b.colaborador_id = $${params.length}`;
  }
  
  if (inicio) {
    // Trava na meia-noite do dia de início
    params.push(inicio + ' 00:00:00');
    query += ` AND b.data_hora >= $${params.length}`;
  }
  
  if (fim) {
    // Trava no último segundo do dia de fim (pra não perder as horas da tarde)
    params.push(fim + ' 23:59:59');
    query += ` AND b.data_hora <= $${params.length}`;
  }
  
  // Ordem crescente: vital pro front-end conseguir fazer a conta de Entrada -> Saída
  query += ` ORDER BY b.data_hora ASC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erro ao buscar batidas filtradas:', err.message);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}

// 🚀 O CADEADO: Libera as funções para o arquivo de rotas
module.exports = {
  getHorasTrabalhadasPorColaborador,
  getBatidasFiltradas
};