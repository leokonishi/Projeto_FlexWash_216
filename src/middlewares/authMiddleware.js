import jwt from 'jsonwebtoken';

// Função que verifica o token e o perfil
export const verificarPerfil = (perfilExigido) => {
  return (req, res, next) => {
    // Pega o token enviado pelo frontend no cabeçalho (Header)
    const tokenHeader = req.headers.authorization;

    if (!tokenHeader) {
      return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    // O formato padrão é "Bearer TOKEN_AQUI", então separamos pelo espaço
    const token = tokenHeader.split(' ')[1];

    try {
      // Descriptografa usando a chave do seu .env
      const decodificado = jwt.verify(token, process.env.JWT_SECRET);
      
      // Pendura os dados do usuário na requisição para uso futuro
      req.usuario = decodificado; 

      // Se a rota exige um perfil específico (ex: 'admin') e o usuário não o tem:
      if (perfilExigido && req.usuario.perfil !== perfilExigido) {
        return res.status(403).json({ erro: 'Acesso negado. Perfil sem permissão.' });
      }

      // Tudo certo, libera a passagem para o controller
      next(); 
    } catch (erro) {
      res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
  };
};