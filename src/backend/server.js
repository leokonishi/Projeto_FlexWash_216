const express = require('express');
const cors = require('cors');
const cadastroCliente = require('./endpoints/cadastroCliente');
const verificarToken = require('./middleware/auth'); // Importa o "segurança"

const app = express();
const PORTA = 8080;

app.use(cors());
app.use(express.json());

// Registra o endpoint de cadastro
app.use('/api', cadastroCliente);

// Registra o endpoint de login
app.use('/api', require('./endpoints/loginCliente'));

// Rota protegida de teste para validar o middleware de token
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});