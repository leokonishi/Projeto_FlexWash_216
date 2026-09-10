const express = require('express');
const cors = require('cors');
const cadastroCliente = require('./endpoints/cadastroCliente');

const app = express();
const PORTA = 8080;

app.use(cors());
app.use(express.json());

// Registra o endpoint de cadastro
app.use('/api', cadastroCliente);

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});