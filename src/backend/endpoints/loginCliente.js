const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Importa o JWT
const db = require('../bd');

// Defina uma chave secreta para assinar os tokens
const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail e a senha.' });
  }

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

    try {
      const senhaCorreta = await bcrypt.compare(senha, cliente.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
      }

      // Gera o Token JWT válido por 2 horas
      const token = jwt.sign(
        { id: cliente.id, email: cliente.email, nome: cliente.nome },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      // Retorna o token junto com a mensagem de sucesso
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso!',
        token,
        usuario: {
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email
        }
      });
    } catch (erro) {
      console.error('Erro ao verificar senha:', erro);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar autenticação.' });
    }
  });
});

module.exports = router;