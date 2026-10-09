const express = require('express');
const cors = require('cors');
const cadastroCliente = require('./endpoints/cadastroCliente');
const loginGestao = require('./endpoints/loginGestao');
const funcionariosRoutes = require('./endpoints/funcionarios');
const servicosRoutes = require('./endpoints/servicos'); // Importa os serviços
require('dotenv').config();
const verificarToken = require('./middleware/auth');

// 1. INICIALIZA O APP PRIMEIRO
const app = express();

app.use(cors());
app.use(express.json());

// 2. REGISTRA AS ROTAS DEPOIS DO APP ESTAR INICIALIZADO
app.use('/api', cadastroCliente);
app.use('/api', require('./endpoints/loginCliente'));
app.use('/api', funcionariosRoutes);
app.use('/api', servicosRoutes); // <- Agora sim, funciona perfeitamente!
app.use('/api', loginGestao);

// Rota protegida de teste
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;