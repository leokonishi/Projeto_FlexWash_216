const express = require('express');
const router = express.Router();
const db = require('../bd');
const verificarToken = require('../middleware/auth');

// 1. CAMADA DE DADOS
const ComissoesDB = {
  buscarExtrato: (funcionarioId) => {
    return new Promise((resolve, reject) => {
      // Busca apenas serviços que já foram concluídos e traz os nomes para facilitar na tela
      const sql = `
        SELECT 
          os.id AS ordem_id,
          os.criado_em AS data_execucao,
          s.nome AS nome_servico,
          c.nome AS nome_cliente,
          os.valor_total AS valor_servico,
          os.valor_comissao,
          os.status_pagamento
        FROM ordens_servico os
        INNER JOIN servicos s ON os.servico_id = s.id
        LEFT JOIN clientes c ON os.cliente_id = c.id
        WHERE os.funcionario_id = ? AND os.status_execucao = 'Concluido'
        ORDER BY os.criado_em DESC
      `;
      
      db.query(sql, [funcionarioId], (err, resultados) => {
        if (err) reject(err);
        else resolve(resultados);
      });
    });
  }
};

// 2. CAMADA DE ROTAS
router.get('/funcionario/comissoes', verificarToken, async (req, res) => {
  // Extrai o ID do token de forma segura
  const funcionarioId = req.usuarioLogado.id;

  try {
    const extrato = await ComissoesDB.buscarExtrato(funcionarioId);
    
    // Calcula as métricas financeiras automaticamente para o Frontend
    let totalPendente = 0;
    let totalPago = 0;

    extrato.forEach(item => {
      const comissao = parseFloat(item.valor_comissao) || 0;
      if (item.status_pagamento === 'Pendente') {
        totalPendente += comissao;
      } else if (item.status_pagamento === 'Pago') {
        totalPago += comissao;
      }
    });

    const resumo = {
      total_acumulado: totalPendente + totalPago, // Tudo que ele gerou no sistema
      total_pendente: totalPendente,              // O que a loja ainda deve a ele
      total_pago: totalPago                       // O que já foi acertado
    };

    return res.status(200).json({ 
      sucesso: true, 
      dados: {
        resumo,
        extrato
      }
    });
  } catch (erro) {
    console.error('Erro ao buscar extrato de comissoes:', erro);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno ao consultar as suas comissoes.' 
    });
  }
});

module.exports = router;