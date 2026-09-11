const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Importa a biblioteca de criptografia
const db = require('../bd'); 

router.post('/clientes', async (req, res) => {
  const { nome, email, telefone, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    // Criptografa a senha antes de salvar no banco
    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

    const sql = 'INSERT INTO clientes (nome, email, telefone, senha) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [nome, email, telefone || '', senhaCriptografada], (err, resultado) => {
      if (err) {
        console.error('Erro ao inserir cliente:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ sucesso: false, mensagem: 'Este e-mail já está cadastrado.' });
        }
        return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao cadastrar cliente.' });
      }

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cliente cadastrado com sucesso!',
        idUsuario: resultado.insertId
      });
    });
  } catch (erro) {
    console.error('Erro ao criptografar senha:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no processamento da senha.' });
  }
});

module.exports = router;