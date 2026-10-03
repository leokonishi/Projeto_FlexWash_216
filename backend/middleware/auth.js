const jwt = require('jsonwebtoken');
const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ sucesso: false, mensagem: 'Acesso negado. Token não fornecido.' });
  }

  // O formato esperado do header é "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    const decodificado = jwt.verify(token, JWT_SECRET);
    req.usuarioLogado = decodificado; // Salva os dados do usuário na requisição
    next(); // Permite que a requisição continue para a rota oficial
  } catch (erro) {
    return res.status(403).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }
}

module.exports = verificarToken;