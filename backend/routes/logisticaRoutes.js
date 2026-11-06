// Configuração do leva e traz (tela do gerente): endereço do lava-rápido, raio máximo
// em km e valor por veículo. O acesso (só administrador) é aplicado no server.js,
// pelo prefixo /api/admin. Regras em services/logistica.js.
const express = require('express');
const router = express.Router();
const db = require('../bd');
const { ultimaConfig, salvarConfig } = require('../services/logistica');
const { ErroNegocio } = require('../services/erros');

function responderErro(res, erro, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes || {}) });
    }
    console.error(mensagemPadrao, erro);
    return res.status(500).json({ erro: mensagemPadrao });
}

router.get('/admin/logistica', async (req, res) => {
    try {
        res.status(200).json((await ultimaConfig(db)) || null);
    } catch (erro) {
        responderErro(res, erro, 'Erro ao carregar a configuração do leva e traz.');
    }
});

router.put('/admin/logistica', async (req, res) => {
    try {
        const config = await salvarConfig(db, req.body);
        res.status(200).json({ mensagem: 'Configuração do leva e traz salva!', config });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao salvar a configuração do leva e traz.');
    }
});

module.exports = router;
