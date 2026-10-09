const express = require('express');
const router = express.Router();
const db = require('../bd');
const verificarToken = require('../middleware/auth'); // O seu middleware de segurança

// 1. CAMADA DE DADOS
const TarefasDB = {
  listarPorFuncionario: (funcionarioId) => {
    return new Promise((resolve, reject) => {
      // O LEFT JOIN traz os nomes do serviço e do cliente em vez de apenas os IDs numéricos
      const sql = `
        SELECT 
          os.id AS ordem_id,
          os.status_execucao,
          os.status_pagamento,
          os.valor_total,
          os.criado_em,
          s.nome AS nome_servico,
          c.nome AS nome_cliente,
          os.veiculo_id
        FROM ordens_servico os
        LEFT JOIN servicos s ON os.servico_id = s.id
        LEFT JOIN clientes c ON os.cliente_id = c.id
        WHERE os.funcionario_id = ?
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
router.get('/funcionario/tarefas', verificarToken, async (req, res) => {
  // EXTRAI O ID DO TOKEN (Segurança Máxima: o utilizador não consegue forjar o próprio ID)
  const idDoFuncionario = req.usuarioLogado.id;

  try {
    const tarefas = await TarefasDB.listarPorFuncionario(idDoFuncionario);
    
    return res.status(200).json({ 
      sucesso: true, 
      dados: tarefas 
    });
  } catch (erro) {
    console.error('Erro ao buscar tarefas do funcionario:', erro);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno ao buscar a sua lista de tarefas.' 
    });
  }
});

module.exports = router;