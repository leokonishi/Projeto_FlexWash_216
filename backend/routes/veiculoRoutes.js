// backend/routes/veiculoRoutes.js
const express = require('express');
const router = express.Router();
const veiculoController = require('../controllers/veiculoController');

// Middleware de autenticação (opcional, mas recomendado para proteger a rota)
// const { verificarToken } = require('../middlewares/auth');

// Rota para listar carros de um cliente (GET /api/clientes/1/veiculos)
router.get('/clientes/:cliente_id/veiculos', veiculoController.listarVeiculosDoCliente);

// Rota para adicionar carro a um cliente (POST /api/clientes/1/veiculos)
router.post('/clientes/:cliente_id/veiculos', veiculoController.adicionarVeiculo);

// Rota para deletar um carro específico (DELETE /api/veiculos/5)
router.delete('/veiculos/:veiculo_id', veiculoController.removerVeiculo);

module.exports = router;