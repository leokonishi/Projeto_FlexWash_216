const express = require('express');
const router = express.Router();
const validar = require('../services/validacao');
const { esquecerUsuario } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const db = require('../bd');

// 1. CAMADA DE DADOS COM PROMISES (Compatível com mysql2/promise)
const FuncionarioDB = {
  // situacao: 'ativos' (padrão), 'inativos' (aba "Inativos") ou 'todos' (filtro do Histórico)
  listarApenasFuncionarios: async (situacao = 'ativos') => {
    const sql = `
      SELECT id, nome, cpf, email, telefone, funcoes, perfil, criado_em, ativo, inativado_em
      FROM funcionarios 
      WHERE perfil = 'funcionario' AND ativo IN (?, ?)
      ORDER BY ativo DESC, nome ASC
    `;
    const filtro = { ativos: [1, 1], inativos: [0, 0], todos: [0, 1] }[situacao] || [1, 1];
    const [resultados] = await db.execute(sql, filtro);
    return resultados;
  },

  verificarDuplicidade: async (cpf, email) => {
    const sql = 'SELECT id, ativo FROM funcionarios WHERE cpf = ? OR email = ? LIMIT 1';
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
    // Inativos só para o administrador; "todos" serve para filtrar o histórico por quem já saiu
    let situacao = 'ativos';
    if (req.query.todos === '1') situacao = 'todos';
    else if (req.query.inativos === '1' && req.usuarioLogado?.perfil === 'administrador') situacao = 'inativos';
    const lista = await FuncionarioDB.listarApenasFuncionarios(situacao);
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
  const listaFuncoes = lerFuncoes(req.body.funcoes);
  let nome, cpf, email, telefone, senha;
  try {
    nome = validar.nome(req.body.nome);
    cpf = validar.cpf(req.body.cpf);
    email = validar.email(req.body.email, { obrigatorio: true });
    telefone = validar.telefone(req.body.telefone);
    senha = validar.senha(req.body.senha);
  } catch (erro) {
    return res.status(400).json({ sucesso: false, mensagem: erro.message });
  }
  if (listaFuncoes.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Selecione pelo menos uma função.' });
  }

  try {
    const duplicado = await FuncionarioDB.verificarDuplicidade(cpf, email);
    if (duplicado) {
      const mensagem = duplicado.ativo
        ? 'CPF ou e-mail já cadastrado no sistema.'
        : 'Este CPF ou e-mail é de um funcionário inativo. Reative-o na aba "Inativos".';
      return res.status(409).json({ sucesso: false, mensagem });
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

// Normaliza as funções (array ou texto separado por vírgula)
function lerFuncoes(funcoes) {
  return (Array.isArray(funcoes)
    ? funcoes
    : typeof funcoes === 'string' && funcoes.trim() !== ''
    ? funcoes.split(',')
    : []).map((f) => String(f).trim()).filter(Boolean);
}

// EDITAR FUNCIONÁRIO (PUT) - só administrador. Senha é opcional: em branco mantém a atual.
router.put('/funcionarios/:id', async (req, res) => {
  const listaFuncoes = lerFuncoes(req.body.funcoes);
  let nome, cpf, email, telefone, senha = '';
  try {
    const [[atual]] = await db.execute('SELECT cpf FROM funcionarios WHERE id = ?', [req.params.id]);
    nome = validar.nome(req.body.nome);
    cpf = validar.cpfNaEdicao(req.body.cpf, atual?.cpf);
    email = validar.email(req.body.email, { obrigatorio: true });
    telefone = validar.telefone(req.body.telefone);
    if (req.body.senha) senha = validar.senha(req.body.senha); // em branco mantém a atual
  } catch (erro) {
    return res.status(400).json({ sucesso: false, mensagem: erro.message });
  }
  if (listaFuncoes.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Selecione pelo menos uma função.' });
  }

  try {
    const [[duplicado]] = await db.execute(
      'SELECT id FROM funcionarios WHERE (cpf = ? OR email = ?) AND id <> ? LIMIT 1',
      [cpf, email, req.params.id]
    );
    if (duplicado) {
      return res.status(409).json({ sucesso: false, mensagem: 'CPF ou E-mail ja cadastrado para outra pessoa.' });
    }

    const campos = ['nome = ?', 'cpf = ?', 'email = ?', 'telefone = ?', 'funcoes = ?'];
    const valores = [nome, cpf, email, telefone, listaFuncoes.join(', ')];
    if (senha) {
      campos.push('senha = ?');
      valores.push(await bcrypt.hash(senha, 10));
    }

    // "perfil = 'funcionario'": o administrador não é editado por esta tela
    const [resultado] = await db.execute(
      `UPDATE funcionarios SET ${campos.join(', ')} WHERE id = ? AND perfil = 'funcionario'`,
      [...valores, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Funcionario nao encontrado.' });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Funcionario atualizado com sucesso!',
      dados: { id: Number(req.params.id), nome, cpf, email, telefone, funcoes: listaFuncoes, perfil: 'funcionario' }
    });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ sucesso: false, mensagem: 'CPF ou E-mail ja cadastrado para outra pessoa.' });
    }
    console.error('Erro ao atualizar funcionario:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar funcionario.' });
  }
});

// EXCLUIR FUNCIONÁRIO (DELETE) - só administrador.
// Bloqueia se ele ainda está escalado em um serviço agendado ou no pátio.
// No histórico, as lavagens já feitas continuam (só deixam de mostrar o nome dele).
router.delete('/funcionarios/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [[ativos]] = await db.execute(
      `SELECT COUNT(*) AS total FROM execucao_funcionarios ef JOIN execucoes e ON e.id = ef.execucao_id
       WHERE ef.funcionario_id = ? AND e.status IN ('Agendado', 'Aguardando', 'Em Andamento')`,
      [id]
    );
    if (Number(ativos.total) > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: `Este funcionário está escalado em ${ativos.total} serviço(s) agendado(s) ou no pátio. Finalize esses serviços ou troque a equipe antes.`
      });
    }

    // Com histórico (lavou algum carro ou foi motorista): inativa, para o nome continuar
    // no histórico e nas comissões. Sem histórico: apaga de vez.
    const [[historico]] = await db.execute(
      `SELECT (SELECT COUNT(*) FROM execucao_funcionarios WHERE funcionario_id = ?)
            + (SELECT COUNT(*) FROM agendamentos WHERE motorista_id = ?) AS total`,
      [id, id]
    );
    if (Number(historico.total) > 0) {
      const [r] = await db.execute(
        "UPDATE funcionarios SET ativo = 0, inativado_em = NOW() WHERE id = ? AND perfil = 'funcionario' AND ativo = 1",
        [id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado.' });
      esquecerUsuario('funcionario', id); // o login dele para de funcionar na hora
      return res.status(200).json({
        sucesso: true,
        inativado: true,
        mensagem: 'Funcionário inativado. Ele não entra mais no sistema, mas continua no histórico e nas comissões.'
      });
    }

    const resultado = await FuncionarioDB.removerPorId(id);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado.' });
    }
    esquecerUsuario('funcionario', id);
    return res.status(200).json({ sucesso: true, inativado: false, mensagem: 'Funcionário removido.' });
  } catch (erro) {
    if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ sucesso: false, mensagem: 'Este funcionário tem registros ligados a ele e não pode ser removido.' });
    }
    console.error('Erro ao remover funcionario:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover funcionário.' });
  }
});

// REATIVAR FUNCIONÁRIO (POST /api/funcionarios/:id/reativar) - só administrador
router.post('/funcionarios/:id/reativar', async (req, res) => {
  try {
    const [r] = await db.execute(
      "UPDATE funcionarios SET ativo = 1, inativado_em = NULL WHERE id = ? AND perfil = 'funcionario' AND ativo = 0",
      [req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ sucesso: false, mensagem: 'Funcionário inativo não encontrado.' });
    esquecerUsuario('funcionario', req.params.id);
    return res.status(200).json({ sucesso: true, mensagem: 'Funcionário reativado. Ele já pode entrar de novo.' });
  } catch (erro) {
    console.error('Erro ao reativar funcionario:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao reativar o funcionário.' });
  }
});

module.exports = router;