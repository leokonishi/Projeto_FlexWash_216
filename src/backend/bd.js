const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
<<<<<<< HEAD
  password: 'AlE11012007!',
=======
  password: 'Guguled232729.',
>>>>>>> 281b8036f553278d45215c5b5bd1a98b6d83904f
  database: 'FlexWash',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err);
    return;
  }
  console.log('Conectado ao MySQL Server 2022 com sucesso!');
});

module.exports = db;