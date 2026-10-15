const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ sucesso: false, mensagem: 'Acesso negado. Token não fornecido.' });
  }

  // O formato esperado do header é "Bearer <token>"
  const [esquema, token] = authHeader.split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ sucesso: false, mensagem: 'Acesso negado. Formato de token inválido.' });
  }

  try {
    // Fixa o algoritmo para impedir tokens assinados com outro método (ex.: "none")
    const decodificado = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.usuarioLogado = decodificado; // Salva os dados do usuário na requisição
    next(); // Permite que a requisição continue para a rota oficial
  } catch (erro) {
    // 401 = sessão inválida/expirada (o frontend usa isso para mandar o usuário ao login)
    return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }
}

module.exports = verificarToken;
