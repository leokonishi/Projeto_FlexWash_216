function verificarPerfil(perfisPermitidos) {
  return (req, res, next) => {
    const perfilUsuario = req.usuarioLogado?.perfil;

    if (!perfilUsuario) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Perfil não identificado no token.' 
      });
    }

    // O Administrador (gerente) tem acesso livre automático a todas as rotas operacionais
    if (perfilUsuario === 'administrador') {
      return next();
    }

    // Se não for admin, valida se o perfil atual consta na lista permitida para esta rota específica
    if (!perfisPermitidos.includes(perfilUsuario)) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado. Seu perfil não possui permissão para acessar este recurso.' 
      });
    }

    next();
  };
}

module.exports = verificarPerfil;

//codigo para permitir o acesso a depender do nivel de usuario, caso seja cliente; possuir acessos de cliente
// caso funcionario; possuir acesso de funcionar
// caso administrador, possuir os mesmos acessos de funcionario + os de administrador 