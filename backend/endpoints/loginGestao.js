const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd'); // Agora usa Promises!
const { JWT_SECRET } = require('../config/jwt');
const limite = require('../services/limiteLogin');

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

  const emailLimpo = String(email).trim().toLowerCase();
  const bloqueado = limite.minutosBloqueado('equipe', emailLimpo, req.ip);
  if (bloqueado) {
    return res.status(429).json({ sucesso: false, mensagem: `Muitas tentativas erradas. Tente de novo em ${bloqueado} min.` });
  }
  const senhaErrada = () => {
    const restam = limite.registrarFalha('equipe', emailLimpo, req.ip);
    const aviso = restam === 0
      ? ' Por segurança, o login deste e-mail ficou bloqueado por 15 minutos.'
      : ` Você ainda tem ${restam} de ${limite.MAX_POR_EMAIL} tentativas antes de o login ser bloqueado por 15 minutos.`;
    return res.status(401).json({ sucesso: false, mensagem: `E-mail, senha ou perfil inválidos.${aviso}` });
  };

  const sql = 'SELECT * FROM funcionarios WHERE email = ? AND LOWER(perfil) = ?';

  // Usamos try/catch no lugar do callback
  try {
    // db.execute usando await!
    const [resultados] = await db.execute(sql, [email.trim(), perfilNormalizado]);

    if (resultados.length === 0) return senhaErrada();

    const usuario = resultados[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) return senhaErrada();
    limite.limparEmail('equipe', emailLimpo);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil, nome: usuario.nome },
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