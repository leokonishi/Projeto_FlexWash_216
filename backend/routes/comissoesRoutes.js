const express = require('express');
const router = express.Router();
const db = require('../bd');
const { relatorioAdmin, extratoFuncionario } = require('../services/comissoes');
const { ErroNegocio } = require('../services/erros');

function responderErro(res, erro, mensagem) {
  if (erro instanceof ErroNegocio) return res.status(erro.status).json({ erro: erro.message });
  console.error(mensagem, erro);
  return res.status(500).json({ erro: mensagem });
}

// Relatório de comissões do período (só administrador: /api/admin é soAdmin no server.js)
// GET /api/admin/comissoes?inicio=AAAA-MM-DD&fim=AAAA-MM-DD (padrão: mês atual até hoje)
router.get('/admin/comissoes', async (req, res) => {
  try {
    res.status(200).json(await relatorioAdmin(db, req.query));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao gerar o relatório de comissões.');
  }
});

// Extrato do próprio funcionário logado (/api/funcionario é equipe no server.js)
router.get('/funcionario/comissoes', async (req, res) => {
  try {
    res.status(200).json(await extratoFuncionario(db, req.usuarioLogado.id, req.query));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao gerar o extrato de comissões.');
  }
});

module.exports = router;
