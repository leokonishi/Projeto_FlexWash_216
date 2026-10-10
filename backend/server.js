const express = require('express');
const cors = require('cors');
require('dotenv').config();

const verificarToken = require('./middleware/auth');

// ==========================================
// 1. IMPORTAÇÃO DOS ENDPOINTS E ROTAS
// ==========================================
const cadastroCliente = require('./endpoints/cadastroCliente');
const loginGestao = require('./endpoints/loginGestao');
const funcionariosRoutes = require('./endpoints/funcionarios');
const comissoesFuncionarioRoutes = require('./endpoints/comissoesFuncionario');
const tarefasFuncionarioRoutes = require('./endpoints/tarefasFuncionario');
const faturamentoAdminRoutes = require('./endpoints/faturamentoAdmin');

// IMPORTAÇÃO CORRIGIDA (Adicionado o que faltava)
const comissoesAdminRoutes = require('./endpoints/comissoesAdmin'); 

// IMPORTAÇÕES DA PASTA 'routes' (Apenas 1 vez cada!)
const veiculoRoutes = require('./routes/veiculoRoutes');
const servicosRoutes = require('./routes/servicosRoutes'); 
const execucoesRoutes = require('./routes/execucoesRoutes'); 
const loginClienteRoutes = require('./endpoints/loginCliente');
// ==========================================
// 2. INICIALIZAÇÃO DO APP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 3. REGISTO DAS ROTAS
// ==========================================
app.post('/api/clientes', cadastroCliente.cadastrar);
app.get('/api/clientes', cadastroCliente.listarClientes);

app.use('/api', require('./endpoints/loginCliente'));
app.use('/api', funcionariosRoutes);
app.use('/api', servicosRoutes); 
app.use('/api', loginClienteRoutes);
app.use('/api', execucoesRoutes);
app.use('/api', veiculoRoutes);
app.use('/api', comissoesFuncionarioRoutes);
app.use('/api', comissoesAdminRoutes);
app.use('/api', tarefasFuncionarioRoutes);
app.use('/api', faturamentoAdminRoutes);
app.use('/api', loginGestao);

// Rota protegida de teste
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

// ==========================================
// 4. INICIA O SERVIDOR (PORTA 8080 PARA O FRONTEND)
// ==========================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;