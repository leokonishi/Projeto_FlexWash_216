const express = require('express');
const cors = require('cors');
const cadastroCliente = require('./endpoints/cadastroCliente');
const loginCliente = require('./endpoints/loginCliente');

const app = express();
const PORTA = 8080;

app.use(cors());
app.use(express.json());

// Registra o endpoint de cadastro
app.use('/api', cadastroCliente);
app.use('/api', loginCliente);

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});