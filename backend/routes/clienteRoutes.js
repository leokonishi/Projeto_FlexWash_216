const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/clientes', clienteController.listarClientes);
router.post('/clientes', clienteController.cadastrarCliente);
router.get('/:id', clienteController.buscarClientePorId);
router.put('/:id', clienteController.atualizarEndereco);

module.exports = router;