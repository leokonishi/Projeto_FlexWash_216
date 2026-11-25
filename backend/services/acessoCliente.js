// Link por e-mail para criar ou trocar a senha. Serve para o cliente (primeiro acesso de quem
// foi cadastrado no balcão e "esqueci minha senha") e para a equipe ("esqueci minha senha").
// Não precisa de tabela no banco:
// - o link leva um token assinado que vale 48 h (2 h para a equipe);
// - o token guarda uma "impressão" da senha atual, então deixa de valer assim que a senha
//   é criada ou trocada (uso único) e quando um link mais novo já foi usado.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { JWT_SECRET } = require('../config/jwt');
const { ErroNegocio } = require('./erros');
const validar = require('./validacao');
const email = require('./email');

const impressao = (senhaHash) => crypto.createHash('sha256').update(String(senhaHash || 'sem-senha')).digest('hex').slice(0, 16);

const urlDoApp = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Monta o envio e a conferência do link para uma tabela (clientes ou funcionarios)
function criarAcesso({ tipo, tabela, caminho, validade, horas, textos }) {
  function gerarLink(pessoa) {
    const token = jwt.sign({ id: pessoa.id, tipo, fp: impressao(pessoa.senha) }, JWT_SECRET, { expiresIn: validade });
    return `${urlDoApp()}${caminho}?token=${encodeURIComponent(token)}`;
  }

  async function enviarLink(pessoa) {
    const link = gerarLink(pessoa);
    const primeiroNome = String(pessoa.nome || '').split(' ')[0] || 'olá';
    const novo = !pessoa.senha;
    const { assunto, chamada, botao } = textos(novo);
    const rodape = `O link vale por ${horas} horas e só pode ser usado uma vez.`;
    const texto = `Olá, ${primeiroNome}!\n\n${chamada}\n\n${link}\n\n${rodape}`;
    const html = `<p>Olá, ${escapar(primeiroNome)}!</p><p>${escapar(chamada)}</p>
<p><a href="${escapar(link)}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">${escapar(botao)}</a></p>
<p style="color:#64748b;font-size:13px">${escapar(rodape)}</p>`;
    return email.enviar({ para: pessoa.email, assunto, texto, html });
  }

  // Pessoa do token, se o link ainda vale. Lança ErroNegocio (410) quando vencido ou já usado.
  async function pessoaDoToken(db, token) {
    let dados;
    try {
      dados = jwt.verify(String(token || ''), JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new ErroNegocio('Este link venceu. Peça um novo na tela de login.', 410);
    }
    if (dados.tipo !== tipo) throw new ErroNegocio('Link inválido.', 400);
    const [[pessoa]] = await db.execute(`SELECT id, nome, email, senha FROM ${tabela} WHERE id = ? AND ativo = 1`, [dados.id]);
    if (!pessoa || impressao(pessoa.senha) !== dados.fp) {
      throw new ErroNegocio('Este link já foi usado. Se precisar, peça um novo na tela de login.', 410);
    }
    return pessoa;
  }

  async function definirSenha(db, token, novaSenha) {
    const pessoa = await pessoaDoToken(db, token);
    const senha = validar.senha(novaSenha);
    await db.execute(`UPDATE ${tabela} SET senha = ? WHERE id = ?`, [await bcrypt.hash(senha, 10), pessoa.id]);
    return pessoa;
  }

  return { gerarLink, enviarLink, pessoaDoToken, definirSenha };
}

const cliente = criarAcesso({
  tipo: 'definir_senha',
  tabela: 'clientes',
  caminho: '/cliente/definir-senha',
  validade: '48h',
  horas: 48,
  textos: (novo) => ({
    assunto: novo ? 'Crie sua senha no FlexWash' : 'Troque sua senha do FlexWash',
    chamada: novo
      ? 'Você foi cadastrado no FlexWash. Crie sua senha para agendar lavagens e acompanhar seu carro pelo app.'
      : 'Recebemos um pedido para trocar a sua senha. Se não foi você, ignore este e-mail.',
    botao: novo ? 'Criar minha senha' : 'Trocar minha senha'
  })
});

// Equipe: validade menor, porque a conta abre o painel de gestão
const equipe = criarAcesso({
  tipo: 'definir_senha_equipe',
  tabela: 'funcionarios',
  caminho: '/gestao/definir-senha',
  validade: '2h',
  horas: 2,
  textos: () => ({
    assunto: 'Troque sua senha do painel FlexWash',
    chamada: 'Recebemos um pedido para trocar a sua senha do painel de gestão. Se não foi você, ignore este e-mail: a senha atual continua valendo.',
    botao: 'Trocar minha senha'
  })
});

module.exports = {
  // Cliente (nomes usados desde antes)
  enviarLink: cliente.enviarLink,
  clienteDoToken: cliente.pessoaDoToken,
  definirSenha: cliente.definirSenha,
  equipe
};
