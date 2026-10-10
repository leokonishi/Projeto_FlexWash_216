const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../bd');

router.post('/login/cliente', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Informe o e-mail e a senha.' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM clientes WHERE email = ? LIMIT 1', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
        }

        const cliente = rows[0];
        const senhaCorreta = await bcrypt.compare(senha, cliente.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
        }

        // Gera o token JWT para o cliente
      // Certifique-se de que está assim no loginCliente.js:
const token = jwt.sign(
    { id: cliente.id, email: cliente.email, perfil: 'cliente' }, // <-- O 'id: cliente.id' é OBRIGATÓRIO AQUI
    process.env.JWT_SECRET || 'segredo_flexwash',
    { expiresIn: '1d' }
);

        res.status(200).json({
            sucesso: true,
            token,
            perfil: 'cliente',
            usuario: { id: cliente.id, nome: cliente.nome, email: cliente.email }
        });
    } catch (erro) {
        console.error('Erro no login do cliente:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;