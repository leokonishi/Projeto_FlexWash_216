const db = require('./bd');
const bcrypt = require('bcrypt');

const nome = 'Nome do Dono'; // Coloque o nome real do dono
const cpf = '123.456.789-00'; // CPF único do gestor
const email = 'dono@flexwash.com'; // E-mail que ele vai usar para logar
const telefone = '(11) 99999-9999'; // Telefone de contato
const senhaPura = 'senha123'; // Senha inicial provisória
const perfil = 'administrador';

async function inserirGestor() {
  try {
    const senhaHash = await bcrypt.hash(senhaPura, 10);
    const sql = 'INSERT INTO funcionarios (nome, cpf, email, telefone, senha, perfil) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(sql, [nome, cpf, email, telefone, senhaHash, perfil], (err, resultado) => {
      if (err) {
        console.error('Erro ao cadastrar gestor:', err.message);
      } else {
        console.log('Gestor cadastrado com sucesso no banco de dados!');
      }
      process.exit();
    });
  } catch (erro) {
    console.error('Erro ao criptografar senha:', erro);
  }
}

inserirGestor();