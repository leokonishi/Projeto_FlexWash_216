const express = require('express');
const router = express.Router();
const db = require('../bd');
const verificarToken = require('../middleware/auth');

router.post('/execucoes', verificarToken, (req, res) => {
  const { cliente_id, veiculo_id, servico_id, valor_total } = req.body;
  const funcionario_id = req.usuarioLogado.id;

  // Validação 1: Dados Incompletos
  if (!cliente_id || !veiculo_id || !servico_id || valor_total === undefined) {
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Todos os campos (cliente, veiculo, servico e valor total) sao obrigatorios.' 
    });
  }

  // Validação 2: Preço Negativo (Trava de Segurança Financeira)
  if (parseFloat(valor_total) < 0) {
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Erro de seguranca: O valor total do servico nao pode ser negativo.' 
    });
  }

  // 1. BUSCA A REGRA DE COMISSÃO ATUAL DO SERVIÇO
  const sqlBuscaComissao = `SELECT tipo_comissao, valor_comissao FROM comissoes_config WHERE servico_id = ? LIMIT 1`;
  
  db.query(sqlBuscaComissao, [servico_id], (errComissao, resultadosComissao) => {
    if (errComissao) {
      console.error('Erro ao buscar regra de comissao:', errComissao);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar comissoes.' });
    }

    let valorComissaoCalculada = 0;
    const totalServico = parseFloat(valor_total);

    // 2. LÓGICA DO CÁLCULO (Se existir regra cadastrada)
    if (resultadosComissao.length > 0) {
      const regra = resultadosComissao[0];

      if (regra.tipo_comissao === 'percentual') {
        // Ex: 50.00 * (15 / 100) = 7.50
        valorComissaoCalculada = totalServico * (parseFloat(regra.valor_comissao) / 100);
      } else if (regra.tipo_comissao === 'fixo') {
        // Ex: R$ 10.00 cravados
        valorComissaoCalculada = parseFloat(regra.valor_comissao);
      }
    }

    // 3. INSERE A ORDEM DE SERVIÇO COM O VALOR DA COMISSÃO CONGELADO (SNAPSHOT)
    const sqlInsert = `
      INSERT INTO ordens_servico 
      (cliente_id, veiculo_id, funcionario_id, servico_id, status_execucao, status_pagamento, valor_total, valor_comissao) 
      VALUES (?, ?, ?, ?, 'Concluido', 'Pendente', ?, ?)
    `;

    const valores = [
      cliente_id, 
      veiculo_id, 
      funcionario_id, 
      servico_id, 
      totalServico,
      valorComissaoCalculada
    ];

    db.query(sqlInsert, valores, (errInsert, result) => {
      if (errInsert) {
        console.error('Erro ao registar execucao no banco:', errInsert);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao registar o servico.' });
      }

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Servico e comissao registados com sucesso!',
        dados: {
          id_ordem: result.insertId,
          valor_total: totalServico,
          comissao_gerada: valorComissaoCalculada
        }
      });
    });
  });
});

module.exports = router;