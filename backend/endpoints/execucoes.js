const express = require('express');
const router = express.Router();
const db = require('../bd');
const verificarToken = require('../middleware/auth');

router.post('/execucoes', verificarToken, (req, res) => {
  // Agora recebemos um array (lista) com os IDs da equipe que fez a lavagem
  const { cliente_id, veiculo_id, servico_id, valor_total, funcionarios_ids } = req.body;

  // Validação 1: Dados Incompletos
  if (!cliente_id || !veiculo_id || !servico_id || valor_total === undefined) {
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Todos os campos (cliente, veiculo, servico e valor total) sao obrigatorios.' 
    });
  }

  // Validação 2: Verificar se a equipe foi selecionada
  if (!funcionarios_ids || !Array.isArray(funcionarios_ids) || funcionarios_ids.length === 0) {
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Pelo menos um funcionario deve ser atribuido a esta lavagem.' 
    });
  }

  // Validação 3: Preço Negativo (Trava de Segurança Financeira)
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

    let valorComissaoIndividual = 0;
    const totalServico = parseFloat(valor_total);

    // 2. LÓGICA DO CÁLCULO (Valor INTEGRAL para CADA funcionário selecionado)
    if (resultadosComissao.length > 0) {
      const regra = resultadosComissao[0];

      if (regra.tipo_comissao === 'percentual') {
        // Ex: R$ 50.00 * (2 / 100) = R$ 1.00 para cada funcionário
        valorComissaoIndividual = totalServico * (parseFloat(regra.valor_comissao) / 100);
      } else if (regra.tipo_comissao === 'fixo') {
        // Ex: R$ 5.00 cravados para cada funcionário
        valorComissaoIndividual = parseFloat(regra.valor_comissao);
      }
    }

    // 3. INSERE A ORDEM DE SERVIÇO PRINCIPAL (Sem os campos antigos de comissão e funcionário)
    const sqlInsertOrdem = `
      INSERT INTO ordens_servico 
      (cliente_id, veiculo_id, servico_id, status_execucao, status_pagamento, valor_total) 
      VALUES (?, ?, ?, 'Concluido', 'Pendente', ?)
    `;

    db.query(sqlInsertOrdem, [cliente_id, veiculo_id, servico_id, totalServico], (errInsert, resultOrdem) => {
      if (errInsert) {
        console.error('Erro ao registar ordem no banco:', errInsert);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao registar a ordem principal.' });
      }

      const ordemId = resultOrdem.insertId;

      // 4. VINCULA A EQUIPE (Insere cada lavador e sua respectiva comissão na tabela intermediária)
      // O formato esperado pelo MySQL para multi-insert é um array de arrays: [[ordem, func1, valor], [ordem, func2, valor]]
      const valoresEquipe = funcionarios_ids.map(func_id => [
        ordemId, 
        func_id, 
        valorComissaoIndividual
      ]);

      const sqlInsertEquipe = `
        INSERT INTO ordens_funcionarios 
        (ordem_id, funcionario_id, valor_comissao_individual) 
        VALUES ?
      `;

      db.query(sqlInsertEquipe, [valoresEquipe], (errEquipe) => {
        if (errEquipe) {
          console.error('Erro ao vincular equipe:', errEquipe);
          return res.status(500).json({ sucesso: false, mensagem: 'Erro ao registrar as comissoes da equipe.' });
        }

        return res.status(201).json({
          sucesso: true,
          mensagem: 'Serviço e comissoes registrados com sucesso!',
          dados: {
            id_ordem: ordemId,
            valor_total: totalServico,
            comissao_por_cabeca: valorComissaoIndividual,
            total_funcionarios_envolvidos: funcionarios_ids.length
          }
        });
      });
    });
  });
});

module.exports = router;