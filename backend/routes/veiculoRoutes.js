const express = require('express');
const router = express.Router();
const veiculoController = require('../controllers/veiculoController');

router.get('/clientes/:cliente_id/veiculos', veiculoController.listarVeiculosDoCliente);
router.post('/clientes/:cliente_id/veiculos', veiculoController.adicionarVeiculo);
router.put('/veiculos/:veiculo_id', veiculoController.atualizarVeiculo);
router.delete('/veiculos/:veiculo_id', veiculoController.removerVeiculo);

module.exports = router;