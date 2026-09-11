const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Guguled232729.',
  database: 'FlexWash',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err.message);
    return;
  }
  console.log('Conectado ao MySQL Server 2022 com sucesso!');
});

module.exports = db;