const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd');

const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

router.post('/login-gestao', (req, res) => {
  const { email, senha, perfil } = req.body;

  if (!email || !senha || !perfil) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail, a senha e o perfil.' });
  }

  // Normaliza o perfil (ex: "Funcionário" -> "funcionario", "Admin" -> "administrador")
  let perfilNormalizado = String(perfil)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (perfilNormalizado === 'admin') {
    perfilNormalizado = 'administrador';
  }

  const sql = 'SELECT * FROM funcionarios WHERE email = ? AND LOWER(perfil) = ?';

  db.query(sql, [email.trim(), perfilNormalizado], async (err, resultados) => {
    if (err) {
      console.error('Erro no servidor ao buscar usuario de gestao:', err.message);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil invalidos.' });
    }

    const usuario = resultados[0];

    try {
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil invalidos.' });
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso!',
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          funcoes: usuario.funcoes || ''
        }
      });
    } catch (erro) {
      console.error('Erro ao verificar senha:', erro);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar autenticacao.' });
    }
  });
});

module.exports = router;