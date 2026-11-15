// Agenda do lava-rápido configurada pelo administrador (/api/admin é soAdmin no server.js)
const express = require('express');
const router = express.Router();
const db = require('../bd');
const configAgenda = require('../services/configAgenda');
const { ErroNegocio } = require('../services/erros');

function responderErro(res, erro, mensagem) {
  if (erro instanceof ErroNegocio) return res.status(erro.status).json({ erro: erro.message });
  console.error(mensagem, erro);
  return res.status(500).json({ erro: mensagem });
}

router.get('/admin/agenda', async (req, res) => {
  try {
    res.status(200).json(await configAgenda.paraPainel(db));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao carregar a agenda.');
  }
});

// { dias_semana: [1..6], horarios: ['08:00', ...], capacidade_por_horario, antecedencia_cancelamento_horas }
router.put('/admin/agenda', async (req, res) => {
  try {
    res.status(200).json({ mensagem: 'Agenda salva!', ...(await configAgenda.salvar(db, req.body)) });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao salvar a agenda.');
  }
});

// Fecha um dia (feriado, manutenção): { data: 'AAAA-MM-DD', motivo }
router.post('/admin/agenda/bloqueios', async (req, res) => {
  try {
    res.status(201).json({ mensagem: 'Dia fechado na agenda.', ...(await configAgenda.adicionarBloqueio(db, req.body)) });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao fechar o dia.');
  }
});

router.delete('/admin/agenda/bloqueios/:data', async (req, res) => {
  try {
    res.status(200).json({ mensagem: 'Dia reaberto.', ...(await configAgenda.removerBloqueio(db, req.params.data)) });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao reabrir o dia.');
  }
});

module.exports = router;
