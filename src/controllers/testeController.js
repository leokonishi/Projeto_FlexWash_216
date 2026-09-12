export const rotaAdmin = (req, res) => {
  // req.usuario foi populado pelo middleware de segurança
  res.json({ mensagem: `Bem-vindo Admin ${req.usuario.nome}! Acesso total liberado.` });
};

export const rotaCliente = (req, res) => {
  res.json({ mensagem: `Olá ${req.usuario.nome}, este é o endpoint restrito para clientes.` });
};