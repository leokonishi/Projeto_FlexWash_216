const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../bd');

const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

// Middleware de proteção: Apenas Administrador
const verificarAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ sucesso: false, mensagem: 'Token nao fornecido.' });

  const token = authHeader.split(' ')[1];
  try {
    const decodificado = jwt.verify(token, JWT_SECRET);
    if (decodificado.perfil !== 'administrador') {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Apenas administradores.' });
    }
    req.usuarioLogado = decodificado;
    next();
  } catch (erro) {
    return res.status(401).json({ sucesso: false, mensagem: 'Token invalido ou expirado.' });
  }
};

// 1. CAMADA DE DADOS
const FaturamentoDB = {
  gerarRelatorio: () => {
    return new Promise((resolve, reject) => {
      // 1ª Query: Soma os totais gerais (Recebido vs A Receber)
      const sqlTotais = `
        SELECT 
          SUM(CASE WHEN status_pagamento = 'Pago' THEN valor_total ELSE 0 END) AS faturamento_recebido,
          SUM(CASE WHEN status_pagamento = 'Pendente' THEN valor_total ELSE 0 END) AS faturamento_pendente,
          COUNT(id) AS total_servicos_realizados
        FROM ordens_servico
        WHERE status_execucao != 'Cancelado'
      `;

      // 2ª Query: Lista os últimos 50 serviços para o extrato detalhado
      const sqlExtrato = `
        SELECT 
          os.id AS ordem_id,
          os.criado_em AS data_servico,
          c.nome AS cliente_nome,
          s.nome AS servico_nome,
          os.valor_total,
          os.status_pagamento,
          os.status_execucao
        FROM ordens_servico os
        LEFT JOIN clientes c ON os.cliente_id = c.id
        LEFT JOIN servicos s ON os.servico_id = s.id
        ORDER BY os.criado_em DESC
        LIMIT 50
      `;

      db.query(sqlTotais, (errTotais, resTotais) => {
        if (errTotais) return reject(errTotais);

        db.query(sqlExtrato, (errExtrato, resExtrato) => {
          if (errExtrato) return reject(errExtrato);
          
          resolve({
            resumo: resTotais[0],
            extrato_recente: resExtrato
          });
        });
      });
    });
  }
};

// 2. CAMADA DE ROTAS
router.get('/admin/relatorios/faturamento', verificarAdmin, async (req, res) => {
  try {
    const relatorio = await FaturamentoDB.gerarRelatorio();
    
    // Formata os dados para garantir que não retornem null caso o banco esteja vazio
    const dadosFormatados = {
      resumo: {
        faturamento_recebido: parseFloat(relatorio.resumo.faturamento_recebido || 0),
        faturamento_pendente: parseFloat(relatorio.resumo.faturamento_pendente || 0),
        total_servicos_realizados: parseInt(relatorio.resumo.total_servicos_realizados || 0)
      },
      extrato_recente: relatorio.extrato_recente
    };

    return res.status(200).json({ 
      sucesso: true, 
      dados: dadosFormatados 
    });
  } catch (erro) {
    console.error('Erro ao gerar relatorio de faturamento:', erro);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno ao gerar o relatorio de faturamento.' 
    });
  }
});

module.exports = router;