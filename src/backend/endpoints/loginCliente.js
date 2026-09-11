const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../bd');

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
  console.log('Cliente encontrado no banco:', cliente.email);
  console.log('Hash salvo no banco:', cliente.senha);

    try {
      // Compara a senha digitada com o hash salvo no banco
      const senhaCorreta = await bcrypt.compare(senha, cliente.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
      }

      // Login bem-sucedido (Corrigido de return.status para res.status)
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso!',
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