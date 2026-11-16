const jwt = require('jsonwebtoken');
const db = require('../bd');
const { JWT_SECRET } = require('../config/jwt');

// Confere a assinatura do token E, no banco, se a pessoa ainda existe.
// Assim um funcionário excluído ou inativado (ou um cliente apagado/inativado) perde o acesso na hora,
// em vez de continuar entrando até o token vencer (8 h para a equipe).
// O perfil vale o que está no banco: rebaixar alguém tem efeito imediato.

// Cache curto para não consultar o banco em toda requisição do mesmo usuário
const CACHE_MS = 15 * 1000;
const cache = new Map(); // 'cliente:12' | 'equipe:3' -> { perfil, ate }

const chave = (perfil, id) => `${perfil === 'cliente' ? 'cliente' : 'equipe'}:${id}`;

async function perfilAtual(perfil, id) {
  const k = chave(perfil, id);
  const guardado = cache.get(k);
  if (guardado && guardado.ate > Date.now()) return guardado.perfil;

  let atual = null;
  if (perfil === 'cliente') {
    const [[linha]] = await db.execute('SELECT id FROM clientes WHERE id = ? AND ativo = 1', [id]);
    atual = linha ? 'cliente' : null;
  } else {
    const [[linha]] = await db.execute('SELECT perfil FROM funcionarios WHERE id = ? AND ativo = 1', [id]);
    atual = linha ? String(linha.perfil || '').toLowerCase() : null;
  }
  cache.set(k, { perfil: atual, ate: Date.now() + CACHE_MS });
  return atual;
}

// Chamar ao excluir ou mudar o perfil de alguém (efeito imediato, sem esperar o cache)
function esquecerUsuario(perfil, id) {
  cache.delete(chave(perfil, id));
}

async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ sucesso: false, mensagem: 'Acesso negado. Token não fornecido.' });
  }

  // O formato esperado do header é "Bearer <token>"
  const [esquema, token] = authHeader.split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ sucesso: false, mensagem: 'Acesso negado. Formato de token inválido.' });
  }

  let decodificado;
  try {
    // Fixa o algoritmo para impedir tokens assinados com outro método (ex.: "none")
    decodificado = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // 401 = sessão inválida/expirada (o frontend usa isso para mandar o usuário ao login)
    return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }

  // Tokens de outro uso (ex.: link de criar senha) não abrem sessão
  if (!decodificado.perfil || !decodificado.id) {
    return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }

  try {
    const perfil = await perfilAtual(decodificado.perfil, decodificado.id);
    if (!perfil) {
      return res.status(401).json({ sucesso: false, mensagem: 'Seu acesso foi encerrado. Fale com o administrador.' });
    }
    req.usuarioLogado = { ...decodificado, perfil };
    next();
  } catch (erro) {
    console.error('Erro ao conferir o usuário do token:', erro.message);
    return res.status(503).json({ sucesso: false, mensagem: 'Não foi possível conferir o seu acesso agora. Tente de novo.' });
  }
}

module.exports = verificarToken;
module.exports.esquecerUsuario = esquecerUsuario;
module.exports.perfilAtual = perfilAtual;
