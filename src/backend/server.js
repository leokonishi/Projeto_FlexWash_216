const express = require('express');
const cors = require('cors');
const cadastroCliente = require('./endpoints/cadastroCliente');
const loginGestao = require('./endpoints/loginGestao');
require('dotenv').config();
const verificarToken = require('./middleware/auth'); // Importa o "segurança"

const app = express();

app.use(cors());
app.use(express.json());

// Registra os endpoints
app.use('/api', cadastroCliente);
app.use('/api', require('./endpoints/loginCliente'));
app.use('/api', loginGestao); // Regista o login da gestão aqui

// Rota protegida de teste para validar o middleware de token
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

// Apenas executa o listen se estiver rodando localmente (fora da Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORTA = 8080;
  app.listen(PORTA, () => {
    console.log(`Servidor rodando localmente na porta ${PORTA}`);
  });
}

// Exporta o app para a Vercel transformar em Serverless Function
module.exports = app;