const express = require('express');
const router = express.Router();
const db = require('../bd'); 

router.post('/clientes', (req, res) => {
  const { nome, email, telefone, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios.' });
  }

  const sql = 'INSERT INTO clientes (nome, email, telefone, senha) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [nome, email, telefone || '', senha], (err, resultado) => {
    if (err) {
      console.error('Erro ao inserir cliente:', err.message);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao cadastrar cliente.' });
    }

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Cliente cadastrado com sucesso!',
      idUsuario: resultado.insertId
    });
  });
});

module.exports = router;