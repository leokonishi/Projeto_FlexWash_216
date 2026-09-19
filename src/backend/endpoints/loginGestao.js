const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd'); // Ajuste o caminho do banco se necessário

const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

router.post('/login-gestao', (req, res) => {
  const { email, senha, perfil } = req.body;

  if (!email || !senha || !perfil) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail, a senha e o perfil.' });
  }

  // Aqui você pode adaptar o nome da tabela conforme o seu banco (ex: funcionarios ou usuarios_gestao)
  const sql = 'SELECT * FROM funcionarios WHERE email = ? AND perfil = ?';

  db.query(sql, [email, perfil], async (err, resultados) => {
    if (err) {
      console.error('Erro no servidor ao buscar usuário de gestão:', err.message);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil inválidos.' });
    }

    const usuario = resultados[0];

    try {
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil inválidos.' });
      }

      // Gera o Token JWT contendo o ID, email e o perfil ('administrador' ou 'funcionario')
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
          perfil: usuario.perfil
        }
      });
    } catch (erro) {
      console.error('Erro ao verificar senha:', erro);
      return res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar autenticação.' });
    }
  });
});

module.exports = router;