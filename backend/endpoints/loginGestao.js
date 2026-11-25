const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd'); // Agora usa Promises!
const { JWT_SECRET } = require('../config/jwt');
const limite = require('../services/limiteLogin');
const validar = require('../services/validacao');
const { ErroNegocio } = require('../services/erros');
const { equipe: acessoEquipe } = require('../services/acessoCliente');
const { emailsPublicos } = require('../services/limitePorIp');

// Função assíncrona (async)
router.post('/login-gestao', async (req, res) => {
  const { email, senha, perfil } = req.body;

  if (!email || !senha || !perfil) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail, a senha e o perfil.' });
  }

  // Normaliza o perfil
  let perfilNormalizado = String(perfil)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (perfilNormalizado === 'admin') {
    perfilNormalizado = 'administrador';
  }

  const emailLimpo = String(email).trim().toLowerCase();
  const bloqueado = limite.minutosBloqueado('equipe', emailLimpo, req.ip);
  if (bloqueado) {
    return res.status(429).json({ sucesso: false, mensagem: `Muitas tentativas erradas. Tente de novo em ${bloqueado} min.` });
  }
  const senhaErrada = () => {
    const restam = limite.registrarFalha('equipe', emailLimpo, req.ip);
    const aviso = restam === 0
      ? ' Por segurança, o login deste e-mail ficou bloqueado por 15 minutos.'
      : ` Você ainda tem ${restam} de ${limite.MAX_POR_EMAIL} tentativas antes de o login ser bloqueado por 15 minutos.`;
    return res.status(401).json({ sucesso: false, mensagem: `E-mail, senha ou perfil inválidos.${aviso}` });
  };

  const sql = 'SELECT * FROM funcionarios WHERE email = ? AND LOWER(perfil) = ?';

  // Usamos try/catch no lugar do callback
  try {
    // db.execute usando await!
    const [resultados] = await db.execute(sql, [emailLimpo, perfilNormalizado]);

    if (resultados.length === 0) return senhaErrada();

    const usuario = resultados[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) return senhaErrada();
    if (!usuario.ativo) {
      return res.status(403).json({ sucesso: false, mensagem: 'Seu acesso foi encerrado. Fale com o administrador.' });
    }
    limite.limparEmail('equipe', emailLimpo);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil, nome: usuario.nome },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        funcoes: usuario.funcoes || ''
      }
    });

  } catch (erro) {
    console.error('Erro no servidor ao buscar usuario de gestao:', erro.message);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

const responderErro = (res, erro, contexto) => {
  if (erro instanceof ErroNegocio) return res.status(erro.status).json({ sucesso: false, mensagem: erro.message });
  console.error(contexto, erro);
  return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
};

// ESQUECI A SENHA (EQUIPE): envia o link para o e-mail cadastrado.
// A resposta é sempre a mesma, exista ou não o e-mail.
const ultimoEnvio = new Map(); // e-mail -> horário (evita vários e-mails seguidos)
const INTERVALO_MS = 60 * 1000;
router.post('/acesso/equipe/link', emailsPublicos.middleware, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail.' });
  const resposta = { sucesso: true, mensagem: 'Se este e-mail for da equipe, enviamos um link para trocar a senha. Ele vale por 2 horas. Confira também o spam.' };

  const agora = Date.now();
  if (agora - (ultimoEnvio.get(email) || 0) < INTERVALO_MS) return res.status(200).json(resposta);
  ultimoEnvio.set(email, agora);

  try {
    const [[pessoa]] = await db.execute('SELECT id, nome, email, senha FROM funcionarios WHERE email = ? AND ativo = 1 LIMIT 1', [email]);
    if (pessoa) await acessoEquipe.enviarLink(pessoa).catch((erro) => console.error('Erro ao enviar o link da equipe:', erro.message));
    res.status(200).json(resposta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao enviar o link da equipe:');
  }
});

// Confere o link antes de mostrar o formulário
router.get('/acesso/equipe/link', async (req, res) => {
  try {
    const pessoa = await acessoEquipe.pessoaDoToken(db, req.query.token);
    res.status(200).json({ nome: String(pessoa.nome || '').split(' ')[0], primeiro_acesso: false });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao conferir o link da equipe:');
  }
});

// Troca a senha pelo link. A pessoa entra de novo pela tela de login (escolhendo o perfil).
router.post('/acesso/equipe/senha', async (req, res) => {
  try {
    const pessoa = await acessoEquipe.definirSenha(db, req.body?.token, req.body?.senha);
    limite.limparEmail('equipe', pessoa.email);
    res.status(200).json({ sucesso: true, mensagem: 'Senha trocada! Entre com a nova senha.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao trocar a senha da equipe:');
  }
});

// TROCAR A PRÓPRIA SENHA (equipe logada: funcionário ou administrador)
// Protegida no server.js pelo prefixo /api/funcionario (equipe).
router.put('/funcionario/senha', async (req, res) => {
  const id = req.usuarioLogado.id;
  const senhaAtual = typeof req.body?.senha_atual === 'string' ? req.body.senha_atual : '';
  const bloqueado = limite.minutosBloqueado('troca-senha', String(id), req.ip);
  if (bloqueado) {
    return res.status(429).json({ sucesso: false, mensagem: `Muitas tentativas erradas. Tente de novo em ${bloqueado} min.` });
  }
  try {
    const novaSenha = validar.senha(req.body?.nova_senha);
    const [[pessoa]] = await db.execute('SELECT senha FROM funcionarios WHERE id = ? AND ativo = 1', [id]);
    if (!pessoa) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    if (!senhaAtual || !(await bcrypt.compare(senhaAtual, pessoa.senha))) {
      limite.registrarFalha('troca-senha', String(id), req.ip);
      return res.status(400).json({ sucesso: false, mensagem: 'A senha atual não confere.' });
    }
    if (await bcrypt.compare(novaSenha, pessoa.senha)) {
      return res.status(400).json({ sucesso: false, mensagem: 'A nova senha precisa ser diferente da atual.' });
    }
    await db.execute('UPDATE funcionarios SET senha = ? WHERE id = ?', [await bcrypt.hash(novaSenha, 10), id]);
    limite.limparEmail('troca-senha', String(id));
    res.status(200).json({ sucesso: true, mensagem: 'Senha trocada com sucesso!' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao trocar a senha:');
  }
});

module.exports = router;