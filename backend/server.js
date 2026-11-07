const express = require('express');
const cors = require('cors');
require('dotenv').config();

const verificarToken = require('./middleware/auth');
const { logado, equipe, soAdmin, soCliente, escolher, porMetodo } = require('./middleware/acesso');

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
const meRoutes = require('./routes/meRoutes');
const agendamentosRoutes = require('./routes/agendamentosRoutes');
const logisticaRoutes = require('./routes/logisticaRoutes');

// IMPORTAÇÃO DA PASTA 'endpoints' (Rota de serviços do cliente)
const servicoClienteRoutes = require('./endpoints/servicos');

// ==========================================
// 2. INICIALIZAÇÃO DO APP
// ==========================================
const app = express();

// CORS: em produção, CORS_ORIGIN lista os endereços do frontend que podem chamar a API
// (separados por vírgula, ex.: https://flexwash.vercel.app). Sem a variável, libera qualquer
// origem, como antes (útil no computador).
const origensPermitidas = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
app.use(cors(origensPermitidas.length ? { origin: origensPermitidas } : undefined));
app.use(express.json());

// Saúde do servidor: usada pelo Render (health check) e para conferir se o banco responde.
const db = require('./bd');
app.get('/api/saude', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({ ok: true, banco: 'conectado' });
  } catch (erro) {
    console.error('[saude] Banco indisponível:', erro.message);
    return res.status(503).json({ ok: false, banco: 'indisponível' });
  }
});

// ==========================================
// 3. CONTROLE DE ACESSO (por prefixo de URL)
// ------------------------------------------
// Públicas (sem token): POST /api/clientes (auto-cadastro), /api/login/cliente, /api/login-gestao
// logado  = qualquer perfil autenticado
// equipe  = funcionário + administrador
// soAdmin = apenas administrador
// soCliente = apenas cliente (rotas que usam o id do token como id do cliente)
// ==========================================
app.use('/api/clientes', escolher((req) =>
  req.method === 'POST' && req.path === '/' ? [] : equipe // cadastro público; o resto (lista, frota) é da equipe
));
app.use('/api/veiculos', ...equipe);
app.use('/api/me', ...soCliente);           // dados, endereço e veículos do próprio cliente (id vem do token)
app.use('/api/agendamentos', ...soCliente); // agendamento feito pelo cliente
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
app.use('/api', servicoClienteRoutes); // <--- Regista as rotas de serviços do cliente em /api/servicos
app.use('/api', execucoesRoutes);
app.use('/api', meRoutes);
app.use('/api', agendamentosRoutes);
app.use('/api', logisticaRoutes); // /api/admin/logistica (leva e traz: endereço, raio e valor)
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;