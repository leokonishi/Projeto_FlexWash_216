const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd');
const { JWT_SECRET } = require('../config/jwt');
const { ErroNegocio } = require('../services/erros');
const acesso = require('../services/acessoCliente');
const limite = require('../services/limiteLogin');

// Token de sessão do cliente (o 'id' é usado para restringir o acesso aos próprios dados)
function sessaoDoCliente(cliente) {
    const token = jwt.sign(
        { id: cliente.id, email: cliente.email, perfil: 'cliente', nome: cliente.nome },
        JWT_SECRET,
        { expiresIn: '1d' }
    );
    return { sucesso: true, token, perfil: 'cliente', usuario: { id: cliente.id, nome: cliente.nome, email: cliente.email } };
}

const responderErro = (res, erro, contexto) => {
    if (erro instanceof ErroNegocio) return res.status(erro.status).json({ sucesso: false, mensagem: erro.message });
    console.error(contexto, erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
};

router.post('/login/cliente', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (!email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail e a senha.' });
    }

    const bloqueado = limite.minutosBloqueado('cliente', email, req.ip);
    if (bloqueado) {
        return res.status(429).json({
            sucesso: false,
            mensagem: `Muitas tentativas erradas. Tente de novo em ${bloqueado} min ou use "Primeiro acesso ou esqueci a senha".`
        });
    }
    const senhaErrada = () => {
        const restam = limite.registrarFalha('cliente', email, req.ip);
        const aviso = restam === 0
      ? ' Por segurança, o login deste e-mail ficou bloqueado por 15 minutos.'
      : ` Você ainda tem ${restam} de ${limite.MAX_POR_EMAIL} tentativas antes de o login ser bloqueado por 15 minutos.`;
        return res.status(401).json({ sucesso: false, mensagem: `E-mail ou senha inválidos.${aviso}` });
    };

    try {
        const [rows] = await db.execute('SELECT * FROM clientes WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) return senhaErrada();
        const cliente = rows[0];

        // Cadastrado no balcão: ainda não criou a senha (ou ficou com a antiga senha padrão "123")
        const semSenha = !cliente.senha || (senha === '123' && await bcrypt.compare('123', cliente.senha));
        if (semSenha) {
            return res.status(403).json({
                sucesso: false,
                motivo: 'sem_senha',
                mensagem: 'Você ainda não criou sua senha. Use "Primeiro acesso" para receber o link no seu e-mail.'
            });
        }

        if (!(await bcrypt.compare(senha, cliente.senha))) return senhaErrada();
        limite.limparEmail('cliente', email);
        res.status(200).json(sessaoDoCliente(cliente));
    } catch (erro) {
        responderErro(res, erro, 'Erro no login do cliente:');
    }
});

// PRIMEIRO ACESSO / ESQUECI MINHA SENHA: envia o link para o e-mail cadastrado.
// A resposta é sempre a mesma, exista ou não o e-mail (não revela quem é cliente).
const ultimoEnvio = new Map(); // e-mail -> horário (evita disparar vários e-mails seguidos)
const INTERVALO_MS = 60 * 1000;
router.post('/acesso/link', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail.' });
    const resposta = { sucesso: true, mensagem: 'Se este e-mail estiver cadastrado, enviamos um link para criar a senha. Confira também o spam.' };

    const agora = Date.now();
    if (agora - (ultimoEnvio.get(email) || 0) < INTERVALO_MS) return res.status(200).json(resposta);
    ultimoEnvio.set(email, agora);

    try {
        const [[cliente]] = await db.execute('SELECT id, nome, email, senha FROM clientes WHERE email = ? LIMIT 1', [email]);
        if (cliente) await acesso.enviarLink(cliente);
        res.status(200).json(resposta);
    } catch (erro) {
        responderErro(res, erro, 'Erro ao enviar o link de acesso:');
    }
});

// Confere o link antes de mostrar o formulário (nome para a saudação)
router.get('/acesso/link', async (req, res) => {
    try {
        const cliente = await acesso.clienteDoToken(db, req.query.token);
        res.status(200).json({ nome: String(cliente.nome || '').split(' ')[0], primeiro_acesso: !cliente.senha });
    } catch (erro) {
        responderErro(res, erro, 'Erro ao conferir o link de acesso:');
    }
});

// Cria a senha pelo link e já entra na conta
router.post('/acesso/senha', async (req, res) => {
    try {
        const cliente = await acesso.definirSenha(db, req.body?.token, req.body?.senha);
        res.status(200).json(sessaoDoCliente(cliente));
    } catch (erro) {
        responderErro(res, erro, 'Erro ao definir a senha:');
    }
});

module.exports = router;
