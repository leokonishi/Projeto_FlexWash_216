const express = require('express');
const router = express.Router();
const db = require('../bd');

const verificarToken = require('../middleware/auth');
const verificarPerfil = require('../middleware/perfil');

// Apenas administrador (token válido + perfil 'administrador')
const verificarAdmin = [verificarToken, verificarPerfil([])];

// 1. CAMADA DE DADOS
const AdminComissoesDB = {
  resumoGeral: () => {
    return new Promise((resolve, reject) => {
      // Agrupa todas as comissões por funcionário, somando o pendente e o pago
      const sql = `
        SELECT 
          f.id AS funcionario_id,
          f.nome AS funcionario_nome,
          SUM(CASE WHEN os.status_pagamento = 'Pendente' THEN os.valor_comissao ELSE 0 END) AS total_pendente,
          SUM(CASE WHEN os.status_pagamento = 'Pago' THEN os.valor_comissao ELSE 0 END) AS total_pago
        FROM funcionarios f
        LEFT JOIN ordens_servico os ON f.id = os.funcionario_id AND os.status_execucao = 'Concluido'
        GROUP BY f.id, f.nome
        ORDER BY total_pendente DESC
      `;
      
      db.query(sql, (err, resultados) => {
        if (err) reject(err);
        else resolve(resultados);
      });
    });
  }
};

// 2. CAMADA DE ROTAS
router.get('/admin/comissoes', verificarAdmin, async (req, res) => {
  try {
    const relatorio = await AdminComissoesDB.resumoGeral();
    
    // Calcula o total geral que a empresa está devendo no momento (Soma de todos os funcionários)
    const empresaTotalPendente = relatorio.reduce((acc, curr) => acc + parseFloat(curr.total_pendente || 0), 0);
    const empresaTotalPago = relatorio.reduce((acc, curr) => acc + parseFloat(curr.total_pago || 0), 0);

    return res.status(200).json({ 
      sucesso: true, 
      dados: {
        resumo_empresa: {
          total_pendente_geral: empresaTotalPendente,
          total_pago_geral: empresaTotalPago
        },
        relatorio_funcionarios: relatorio
      }
    });
  } catch (erro) {
    console.error('Erro ao buscar relatorio de comissoes do admin:', erro);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno ao gerar o relatorio financeiro.' 
    });
  }
});

module.exports = router;