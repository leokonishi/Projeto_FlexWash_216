const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../bd');

// 1. CAMADA DE DADOS COM PROMISES (Compatível com mysql2/promise)
const FuncionarioDB = {
  listarApenasFuncionarios: async () => {
    const sql = `
      SELECT id, nome, cpf, email, telefone, funcoes, perfil, criado_em 
      FROM funcionarios 
      WHERE perfil = 'funcionario'
      ORDER BY nome ASC
    `;
    const [resultados] = await db.execute(sql);
    return resultados;
  },

  verificarDuplicidade: async (cpf, email) => {
    const sql = 'SELECT id FROM funcionarios WHERE cpf = ? OR email = ? LIMIT 1';
    const [resultados] = await db.execute(sql, [cpf, email]);
    return resultados[0];
  },

  inserir: async (dados) => {
    const sql = `
      INSERT INTO funcionarios (nome, cpf, email, telefone, funcoes, senha, perfil)
      VALUES (?, ?, ?, ?, ?, ?, 'funcionario')
    `;
    const valores = [
      dados.nome,
      dados.cpf,
      dados.email,
      dados.telefone,
      dados.funcoesFormatadas,
      dados.senhaHash
    ];
    const [res] = await db.execute(sql, valores);
    return { id: res.insertId, ...dados };
  },

  removerPorId: async (id) => {
    const sql = "DELETE FROM funcionarios WHERE id = ? AND perfil = 'funcionario'";
    const [res] = await db.execute(sql, [id]);
    return res;
  }
};

// 2. CAMADA DE ROTAS / CONTROLE
router.get('/funcionarios', async (req, res) => {
  try {
    const lista = await FuncionarioDB.listarApenasFuncionarios();
    const listaFormatada = lista.map((item) => ({
      ...item,
      funcoes: item.funcoes ? item.funcoes.split(',').map((f) => f.trim()) : []
    }));

    return res.status(200).json({ sucesso: true, dados: listaFormatada });
  } catch (erro) {
    console.error('Erro ao listar funcionarios:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar funcionarios.' });
  }
});

router.post('/funcionarios', async (req, res) => {
  const { nome, cpf, email, telefone, funcoes, senha } = req.body;

  const listaFuncoes = Array.isArray(funcoes)
    ? funcoes
    : typeof funcoes === 'string' && funcoes.trim() !== ''
    ? funcoes.split(',').map((f) => f.trim())
    : [];

  if (!nome || !cpf || !email || !telefone || listaFuncoes.length === 0 || !senha) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Preencha todos os campos e selecione pelo menos uma funcao.'
    });
  }

  try {
    const duplicado = await FuncionarioDB.verificarDuplicidade(cpf, email);
    if (duplicado) {
      return res.status(409).json({ sucesso: false, mensagem: 'CPF ou E-mail ja cadastrado no sistema.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const funcoesFormatadas = listaFuncoes.join(', ');

    const novo = await FuncionarioDB.inserir({
      nome,
      cpf,
      email,
      telefone,
      funcoesFormatadas,
      senhaHash
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Funcionario cadastrado com sucesso!',
      dados: {
        id: novo.id,
        nome,
        cpf,
        email,
        telefone,
        funcoes: listaFuncoes,
        perfil: 'funcionario'
      }
    });
  } catch (erro) {
    console.error('Erro ao cadastrar funcionario:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao cadastrar funcionario.' });
  }
});

router.delete('/funcionarios/:id', async (req, res) => {
  try {
    await FuncionarioDB.removerPorId(req.params.id);
    return res.status(200).json({ sucesso: true, mensagem: 'Funcionario removido com sucesso.' });
  } catch (erro) {
    console.error('Erro ao remover funcionario:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover funcionario.' });
  }
});

module.exports = router;