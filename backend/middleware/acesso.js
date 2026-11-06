const verificarToken = require('./auth');
const verificarPerfil = require('./perfil');

// Cadeias de proteção prontas. O administrador sempre passa em verificarPerfil,
// então a lista só precisa dizer quais perfis "extras" têm acesso.
const logado = [verificarToken];                                  // qualquer perfil autenticado (cliente, funcionário, admin)
const equipe = [verificarToken, verificarPerfil(['funcionario'])]; // funcionário + administrador
const soAdmin = [verificarToken, verificarPerfil([])];             // apenas administrador

// Apenas cliente (o administrador NÃO passa: as rotas de cliente usam o id do token
// como id do cliente, e o id de um administrador é de outra tabela).
function apenasCliente(req, res, next) {
  if (req.usuarioLogado?.perfil !== 'cliente') {
    return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Recurso exclusivo da área do cliente.' });
  }
  next();
}
const soCliente = [verificarToken, apenasCliente];

// Escolhe a cadeia de middlewares a partir da requisição e a executa em ordem.
function escolher(seletor) {
  return (req, res, next) => {
    const cadeia = seletor(req);
    let i = 0;
    const proximo = (erro) => {
      if (erro) return next(erro);
      const mw = cadeia[i++];
      return mw ? mw(req, res, proximo) : next();
    };
    proximo();
  };
}

// Leitura (GET) com uma regra e escrita (POST/PUT/PATCH/DELETE) com outra.
function porMetodo(regraLeitura, regraEscrita) {
  return escolher((req) => (req.method === 'GET' ? regraLeitura : regraEscrita));
}

module.exports = { logado, equipe, soAdmin, soCliente, escolher, porMetodo };
