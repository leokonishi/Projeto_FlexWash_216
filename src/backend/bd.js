const mysql = require('mysql2');
require('dotenv').config();

// Verificação para garantir que o .env está carregando os dados
console.log("Tentando conectar com o usuário:", process.hisDB_USER || process.env.DB_USER);

const conexao = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 19164, // Porta do Aiven informada explicitamente para evitar conflito com a porta do servidor
  ssl: {
    rejectUnauthorized: false
  }
});

conexao.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

module.exports = conexao;