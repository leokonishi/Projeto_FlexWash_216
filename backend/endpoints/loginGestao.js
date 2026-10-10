const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd'); // Agora usa Promises!

const JWT_SECRET = 'flexwash_chave_secreta_super_segura';

// Função assíncrona (async)
router.post('/login-gestao', async (req, res) => {
  const { email, senha, perfil } = req.body;

  if (!email || !senha || !perfil) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail, a senha e o perfil.' });
  }

  // Normaliza o perfil
  let perfilNormalizado = String(perfil)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (perfilNormalizado === 'admin') {
    perfilNormalizado = 'administrador';
  }

  const sql = 'SELECT * FROM funcionarios WHERE email = ? AND LOWER(perfil) = ?';

  // Usamos try/catch no lugar do callback
  try {
    // db.execute usando await!
    const [resultados] = await db.execute(sql, [email.trim(), perfilNormalizado]);

    if (resultados.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil inválidos.' });
    }

    const usuario = resultados[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail, senha ou perfil inválidos.' });
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
    console.error('Erro no servidor ao buscar usuario de gestao:', erro.message);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;