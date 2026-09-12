const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd');

// Chave secreta para assinar o token (em projetos reais, use variáveis de ambiente .env)
const CHAVE_SECRETA = 'flexwash_jwt_secret_key_2026';

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail e a senha.' });
  }

  // Busca o cliente pelo e-mail no banco
  const sql = 'SELECT * FROM clientes WHERE email = ?';
  
  db.query(sql, [email], async (err, resultados) => {
    if (err) {
      console.error('Erro no servidor ao buscar usuário:', err.message);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
    }

    const cliente = resultados[0];

    // Compara a senha digitada com o hash salvo no banco
    const senhaValida = await bcrypt.compare(senha, cliente.senha);

    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
    }

    // Gera o Token JWT contendo os dados do usuário (expira em 2 horas)
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email, nome: cliente.nome },
      CHAVE_SECRETA,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      token: token,
      usuario: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email
      }
    });
  });
});

module.exports = router;