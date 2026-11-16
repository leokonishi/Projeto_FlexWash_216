// Link para o cliente criar (ou trocar) a senha: primeiro acesso de quem foi cadastrado
// no balcão e "esqueci minha senha". Não precisa de tabela no banco:
// - o link leva um token assinado que vale 48 h;
// - o token guarda uma "impressão" da senha atual, então deixa de valer assim que a senha
//   é criada ou trocada (uso único) e quando um link mais novo já foi usado.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { JWT_SECRET } = require('../config/jwt');
const { ErroNegocio } = require('./erros');
const validar = require('./validacao');
const email = require('./email');

const VALIDADE = '48h';
const impressao = (senhaHash) => crypto.createHash('sha256').update(String(senhaHash || 'sem-senha')).digest('hex').slice(0, 16);

const urlDoApp = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

function gerarLink(cliente) {
  const token = jwt.sign({ id: cliente.id, tipo: 'definir_senha', fp: impressao(cliente.senha) }, JWT_SECRET, { expiresIn: VALIDADE });
  return `${urlDoApp()}/definir-senha?token=${encodeURIComponent(token)}`;
}

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function enviarLink(cliente) {
  const link = gerarLink(cliente);
  const primeiroNome = String(cliente.nome || '').split(' ')[0] || 'cliente';
  const novo = !cliente.senha;
  const assunto = novo ? 'Crie sua senha no FlexWash' : 'Troque sua senha do FlexWash';
  const chamada = novo
    ? 'Você foi cadastrado no FlexWash. Crie sua senha para agendar lavagens e acompanhar seu carro pelo app.'
    : 'Recebemos um pedido para trocar a sua senha. Se não foi você, ignore este e-mail.';
  const texto = `Olá, ${primeiroNome}!\n\n${chamada}\n\n${link}\n\nO link vale por 48 horas e só pode ser usado uma vez.`;
  const html = `<p>Olá, ${escapar(primeiroNome)}!</p><p>${escapar(chamada)}</p>
<p><a href="${escapar(link)}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">${novo ? 'Criar minha senha' : 'Trocar minha senha'}</a></p>
<p style="color:#64748b;font-size:13px">O link vale por 48 horas e só pode ser usado uma vez.</p>`;
  return email.enviar({ para: cliente.email, assunto, texto, html });
}

// Cliente do token, se o link ainda vale. Lança ErroNegocio (410) quando vencido ou já usado.
async function clienteDoToken(db, token) {
  let dados;
  try {
    dados = jwt.verify(String(token || ''), JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new ErroNegocio('Este link venceu. Peça um novo na tela de login.', 410);
  }
  if (dados.tipo !== 'definir_senha') throw new ErroNegocio('Link inválido.', 400);
  const [[cliente]] = await db.execute('SELECT id, nome, email, senha FROM clientes WHERE id = ? AND ativo = 1', [dados.id]);
  if (!cliente || impressao(cliente.senha) !== dados.fp) {
    throw new ErroNegocio('Este link já foi usado. Se precisar, peça um novo na tela de login.', 410);
  }
  return cliente;
}

async function definirSenha(db, token, novaSenha) {
  const cliente = await clienteDoToken(db, token);
  const senha = validar.senha(novaSenha);
  await db.execute('UPDATE clientes SET senha = ? WHERE id = ?', [await bcrypt.hash(senha, 10), cliente.id]);
  return cliente;
}

module.exports = { enviarLink, clienteDoToken, definirSenha };
