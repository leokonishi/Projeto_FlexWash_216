// Promoções no painel do administrador: configuração da fidelidade e do movimento
// fraco, movimento do dia, geração do cupom relâmpago e lista de cupons.
// O acesso (só administrador) é aplicado no server.js, pelo prefixo /api/admin.
const express = require('express');
const router = express.Router();
const db = require('../bd');
const promocoes = require('../services/promocoes');
const { ErroNegocio } = require('../services/erros');

function responderErro(res, erro, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes || {}) });
    }
    console.error(mensagemPadrao, erro);
    return res.status(500).json({ erro: mensagemPadrao });
}

// Tudo da tela de promoções de uma vez: configuração, movimento de hoje, métricas e cupons
router.get('/admin/promocoes', async (req, res) => {
    try {
        res.status(200).json(await promocoes.painelAdmin(db));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao carregar as promoções.');
    }
});

router.get('/admin/promocoes/config', async (req, res) => {
    try {
        res.status(200).json(await promocoes.obterConfig(db));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao carregar a configuração das promoções.');
    }
});

router.put('/admin/promocoes/config', async (req, res) => {
    try {
        const config = await promocoes.salvarConfig(db, req.body);
        res.status(200).json({ mensagem: 'Configuração das promoções salva!', config });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao salvar a configuração das promoções.');
    }
});

// Volume de carros do dia x meta (GET /api/admin/movimento-diario?data=AAAA-MM-DD; sem data = hoje)
router.get('/admin/movimento-diario', async (req, res) => {
    try {
        res.status(200).json(await promocoes.movimentoDiario(db, req.query.data));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao calcular o movimento do dia.');
    }
});

// Gera o cupom relâmpago do dia. { data?, forcar? } — forcar gera mesmo com o dia na meta.
router.post('/admin/promocoes/movimento-fraco', async (req, res) => {
    try {
        const cupom = await promocoes.gerarPromocaoMovimento(db, {
            data: req.body?.data,
            forcar: req.body?.forcar === true
        });
        res.status(201).json({ mensagem: 'Promoção relâmpago criada!', cupom });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao gerar a promoção.');
    }
});

// Liga/desliga um cupom (relâmpago ou manual). { ativo: true|false }
router.patch('/admin/promocoes/:id', async (req, res) => {
    try {
        await promocoes.alterarAtivo(db, req.params.id, req.body?.ativo);
        res.status(200).json({ mensagem: req.body?.ativo ? 'Cupom reativado.' : 'Cupom desativado.' });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao alterar o cupom.');
    }
});

module.exports = router;
