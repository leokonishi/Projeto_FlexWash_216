const express = require('express');
const cors = require('cors');
require('dotenv').config();

const verificarToken = require('./middleware/auth');
const { logado, equipe, soAdmin, escolher, porMetodo } = require('./middleware/acesso');

// ==========================================
// 1. IMPORTAÇÃO DOS ENDPOINTS E ROTAS
// ==========================================
const cadastroCliente = require('./endpoints/cadastroCliente');
const loginGestao = require('./endpoints/loginGestao');
const loginClienteRoutes = require('./endpoints/loginCliente');
const funcionariosRoutes = require('./endpoints/funcionarios');
const comissoesFuncionarioRoutes = require('./endpoints/comissoesFuncionario');
const tarefasFuncionarioRoutes = require('./endpoints/tarefasFuncionario');
const faturamentoAdminRoutes = require('./endpoints/faturamentoAdmin');
const comissoesAdminRoutes = require('./endpoints/comissoesAdmin');

// IMPORTAÇÕES DA PASTA 'routes'
const veiculoRoutes = require('./routes/veiculoRoutes');
const servicosRoutes = require('./routes/ServicosRoutes');
const execucoesRoutes = require('./routes/execucoesRoutes');

// ==========================================
// 2. INICIALIZAÇÃO DO APP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 3. CONTROLE DE ACESSO (por prefixo de URL)
// ------------------------------------------
// Públicas (sem token): POST /api/clientes (auto-cadastro), /api/login/cliente, /api/login-gestao
// logado  = qualquer perfil autenticado
// equipe  = funcionário + administrador
// soAdmin = apenas administrador
// ==========================================
app.use('/api/clientes', escolher((req) =>
  req.method === 'POST' && req.path === '/' ? [] : equipe // cadastro público; o resto (lista, frota) é da equipe
));
app.use('/api/veiculos', ...equipe);
app.use('/api/pacotes', porMetodo(logado, soAdmin));
app.use('/api/extras', porMetodo(logado, soAdmin));
app.use('/api/funcionarios', porMetodo(equipe, soAdmin));
app.use('/api/execucoes', escolher((req) => {
  if (req.path.startsWith('/cliente/')) return logado; // o próprio handler restringe cliente ao seu id
  if (req.method === 'DELETE') return soAdmin;
  return equipe;
}));
app.use('/api/funcionario', ...equipe); // comissões e tarefas do funcionário logado
app.use('/api/admin', ...soAdmin);      // relatórios financeiros

// ==========================================
// 4. REGISTO DAS ROTAS
// ==========================================
app.post('/api/clientes', cadastroCliente.cadastrar);
app.get('/api/clientes', cadastroCliente.listarClientes);

app.use('/api', loginClienteRoutes);
app.use('/api', loginGestao);
app.use('/api', funcionariosRoutes);
app.use('/api', servicosRoutes);
app.use('/api', execucoesRoutes);
app.use('/api', veiculoRoutes);
app.use('/api', comissoesFuncionarioRoutes);
app.use('/api', comissoesAdminRoutes);
app.use('/api', tarefasFuncionarioRoutes);
app.use('/api', faturamentoAdminRoutes);

// Rota protegida de teste
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

// ==========================================
// 5. INICIA O SERVIDOR (PORTA 8080 PARA O FRONTEND)
// ==========================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
