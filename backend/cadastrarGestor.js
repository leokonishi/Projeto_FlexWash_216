const db = require('./bd');
const bcrypt = require('bcrypt');

const nome = 'Nome do Dono'; // Coloque o nome real do dono
const cpf = '123.456.789-00'; // CPF único do gestor
const email = 'dono@flexwash.com'; // E-mail que ele vai usar para logar
const telefone = '(11) 99999-9999'; // Telefone de contato
// Senha inicial: nunca fica no código. Rode assim (PowerShell):
//   $env:SENHA_GESTOR="umaSenhaForte123"; node cadastrarGestor.js
// Depois de entrar, dá para trocar pelo ícone de chave no painel.
const senhaPura = process.env.SENHA_GESTOR || '';
const perfil = 'administrador';

async function inserirGestor() {
  try {
    require('./services/validacao').senha(senhaPura); // mínimo 8 caracteres, com letras e números
    const senhaHash = await bcrypt.hash(senhaPura, 10);
    const sql = 'INSERT INTO funcionarios (nome, cpf, email, telefone, senha, perfil) VALUES (?, ?, ?, ?, ?, ?)';
    await db.execute(sql, [nome, cpf, email, telefone, senhaHash, perfil]);
    console.log('Gestor cadastrado com sucesso no banco de dados!');
  } catch (erro) {
    console.error(
      erro.code === 'ER_DUP_ENTRY' ? 'Já existe um funcionário com este CPF ou e-mail.' : 'Erro ao cadastrar gestor:',
      erro.code === 'ER_DUP_ENTRY' ? '' : erro.message
    );
    process.exitCode = 1;
  } finally {
    await db.end(); // fecha o pool para o script terminar
  }
}

inserirGestor();
