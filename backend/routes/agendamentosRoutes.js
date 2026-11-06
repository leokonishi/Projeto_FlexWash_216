// Agendamento feito pelo cliente. O acesso (só perfil 'cliente') é aplicado no
// server.js, em /api/agendamentos. Regras em services/agendamentoService.js.
const express = require('express');
const router = express.Router();
const db = require('../bd');
const { registrarAgendamento, horariosDoDia, obterConfiguracao } = require('../services/agendamentoService');
const { avaliarLevaTras } = require('../services/logistica');
const { ErroNegocio } = require('../services/erros');

function responderErro(res, erro, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes || {}) });
    }
    console.error(mensagemPadrao, erro);
    return res.status(500).json({ erro: mensagemPadrao });
}

// 1. CONFIGURAÇÃO (horários, vagas por horário, taxa do leva e traz)
router.get('/agendamentos/config', async (req, res) => {
    try {
        res.status(200).json(await obterConfiguracao(db));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao carregar as opções de agendamento.');
    }
});

// 1b. LEVA E TRAZ PARA O ENDEREÇO DO CLIENTE
// Mede a distância de carro do lava-rápido até o endereço do cliente e diz se está
// dentro do raio. Dentro do raio, devolve o valor por veículo.
router.get('/agendamentos/leva-e-traz', async (req, res) => {
    try {
        res.status(200).json(await avaliarLevaTras(db, req.usuarioLogado.id));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao verificar o leva e traz.');
    }
});

// 2. VAGAS DE UM DIA (GET /api/agendamentos/horarios?data=AAAA-MM-DD)
router.get('/agendamentos/horarios', async (req, res) => {
    try {
        res.status(200).json({ data: req.query.data, horarios: await horariosDoDia(db, req.query.data) });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao buscar os horários.');
    }
});

// 3. CONFIRMAR AGENDAMENTO
router.post('/agendamentos', async (req, res) => {
    try {
        const resultado = await registrarAgendamento(db, req.usuarioLogado.id, req.body);
        res.status(201).json({ mensagem: 'Agendamento confirmado!', ...resultado });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao registrar o agendamento.');
    }
});

module.exports = router;
