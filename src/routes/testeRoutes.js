import { Router } from 'express';
import { verificarPerfil } from '../middlewares/authMiddleware.js';
import { rotaAdmin, rotaCliente } from '../controllers/testeController.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Rota protegida: Só passa quem tiver token válido E o perfil "admin"
router.get('/admin/teste', verificarPerfil('admin'), rotaAdmin);

// Rota protegida: Só passa quem tiver token válido E o perfil "cliente"
router.get('/cliente/teste', verificarPerfil('cliente'), rotaCliente);

// ==========================================
// ROTA TEMPORÁRIA: Use para gerar um token de teste
// ==========================================
router.post('/gerar-token-teste', (req, res) => {
  const { nome, perfil } = req.body;
  
  // Cria um token válido por 1 hora
  const token = jwt.sign({ nome, perfil }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

export default router;