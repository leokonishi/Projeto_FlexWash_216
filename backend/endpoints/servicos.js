const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../bd');

const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

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

const ServicoDB = {
  listarTodos: (apenasAtivos = false) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT id, nome, descricao, preco_base, duracao_estimada, ativo, criado_em FROM servicos';
      if (apenasAtivos) sql += ' WHERE ativo = 1';
      sql += ' ORDER BY nome ASC';
      db.query(sql, (err, resultados) => (err ? reject(err) : resolve(resultados)));
    });
  },

  inserir: (dados) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO servicos (nome, descricao, preco_base, duracao_estimada, ativo)
        VALUES (?, ?, ?, ?, ?)
      `;
      const valores = [dados.nome, dados.descricao, dados.preco_base, dados.duracao_estimada, true];
      db.query(sql, valores, (err, res) => (err ? reject(err) : resolve({ id: res.insertId, ...dados, ativo: true })));
    });
  },

  // NOVO: Atualiza dados do serviço ou apenas o status
  atualizar: (id, dados) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE servicos 
        SET nome = ?, descricao = ?, preco_base = ?, duracao_estimada = ?, ativo = ?
        WHERE id = ?
      `;
      const valores = [dados.nome, dados.descricao, dados.preco_base, dados.duracao_estimada, dados.ativo, id];
      db.query(sql, valores, (err, res) => (err ? reject(err) : resolve({ id, ...dados })));
    });
  }
};

router.get('/servicos', async (req, res) => {
  const apenasAtivos = req.query.ativos === 'true';
  try {
    const lista = await ServicoDB.listarTodos(apenasAtivos);
    return res.status(200).json({ sucesso: true, dados: lista });
  } catch (erro) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar servicos.' });
  }
});

router.post('/servicos', verificarAdmin, async (req, res) => {
  const { nome, descricao, preco_base, duracao_estimada } = req.body;

  // 1. Validação de Dados Incompletos ou Vazios (Evita salvar só espaços)
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ sucesso: false, mensagem: 'O nome do servico e obrigatorio.' });
  }

  // 2. Validação de Valores Negativos
  if (preco_base === undefined || parseFloat(preco_base) < 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'O preco base e obrigatorio e nao pode ser negativo.' });
  }

  if (duracao_estimada !== undefined && parseInt(duracao_estimada) < 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'A duracao estimada nao pode ser negativa.' });
  }

  try {
    const novo = await ServicoDB.inserir({
      nome: nome.trim(), // Remove espaços extras no início e fim
      descricao: descricao ? descricao.trim() : '',
      preco_base: parseFloat(preco_base),
      duracao_estimada: parseInt(duracao_estimada) || 0
    });
    return res.status(201).json({ sucesso: true, mensagem: 'Servico cadastrado.', dados: novo });
  } catch (erro) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar servico.' });
  }
});

// NOVO: Rota PUT para edição
router.put('/servicos/:id', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco_base, duracao_estimada, ativo } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ sucesso: false, mensagem: 'O nome do servico e obrigatorio.' });
  }

  if (preco_base === undefined || parseFloat(preco_base) < 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'O preco base nao pode ser negativo.' });
  }

  if (duracao_estimada !== undefined && parseInt(duracao_estimada) < 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'A duracao estimada nao pode ser negativa.' });
  }

  try {
    const atualizado = await ServicoDB.atualizar(id, {
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : '',
      preco_base: parseFloat(preco_base),
      duracao_estimada: parseInt(duracao_estimada) || 0,
      ativo: Boolean(ativo)
    });

    return res.status(200).json({ sucesso: true, mensagem: 'Servico atualizado!', dados: atualizado });
  } catch (erro) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao editar.' });
  }
});
module.exports = router;