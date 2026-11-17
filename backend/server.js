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

// IMPORTAÇÕES DA PASTA 'routes'
const veiculoRoutes = require('./routes/veiculoRoutes');
const servicosRoutes = require('./routes/ServicosRoutes');
const execucoesRoutes = require('./routes/execucoesRoutes');
const meRoutes = require('./routes/meRoutes');
const agendamentosRoutes = require('./routes/agendamentosRoutes');
const logisticaRoutes = require('./routes/logisticaRoutes');
const promocoesRoutes = require('./routes/promocoesRoutes');
const comissoesRoutes = require('./routes/comissoesRoutes');
const agendaAdminRoutes = require('./routes/agendaAdminRoutes');

// IMPORTAÇÃO DA PASTA 'endpoints' (Rota de serviços do cliente)

// ==========================================
// 2. INICIALIZAÇÃO DO APP
// ==========================================
const app = express();
// Atrás de um proxy (Render, Railway...), TRUST_PROXY=1 faz req.ip ser o IP real do usuário
// (usado no limite de tentativas de login). Sem proxy, deixe sem definir.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
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
// Públicas (sem token): POST /api/clientes (auto-cadastro), /api/login/cliente, /api/login-gestao,
// /api/acesso/* (link por e-mail para criar ou trocar a senha do cliente)
// logado  = qualquer perfil autenticado
// equipe  = funcionário + administrador
// soAdmin = apenas administrador
// soCliente = apenas cliente (rotas que usam o id do token como id do cliente)
// ==========================================
app.use('/api/clientes', escolher((req) => {
  if (req.method === 'POST' && req.path === '/') return []; // cadastro público
  if (req.method === 'DELETE') return soAdmin;              // excluir cliente: só o administrador
  return equipe;                                            // lista, edição e frota: equipe
}));
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
app.put('/api/clientes/:id', cadastroCliente.atualizarCliente);
app.delete('/api/clientes/:id', cadastroCliente.excluirCliente);
app.post('/api/clientes/:id/acesso', cadastroCliente.enviarAcesso);
app.post('/api/clientes/:id/reativar', cadastroCliente.reativarCliente);
app.post('/api/clientes/:id/anonimizar', cadastroCliente.anonimizarCliente);

app.use('/api', loginClienteRoutes);
app.use('/api', loginGestao);
app.use('/api', funcionariosRoutes);
app.use('/api', servicosRoutes);
app.use('/api', execucoesRoutes);
app.use('/api', meRoutes);
app.use('/api', agendamentosRoutes);
app.use('/api', logisticaRoutes); // /api/admin/logistica (leva e traz: endereço, raio e valor)
app.use('/api', promocoesRoutes); // /api/admin/promocoes e /api/admin/movimento-diario (fidelidade e cupons)
app.use('/api', veiculoRoutes);
app.use('/api', agendaAdminRoutes); // /api/admin/agenda (dias, horários, vagas e feriados)
app.use('/api', comissoesRoutes); // /api/admin/comissoes e /api/funcionario/comissoes

// Rota protegida de teste
app.get('/api/protegida', verificarToken, (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Acesso liberado! Token válido.',
    usuario: req.usuarioLogado
  });
});

// ==========================================
// 4b. ERROS GERAIS: sempre JSON, sem expor detalhes internos
// ==========================================
app.use('/api', (req, res) => res.status(404).json({ sucesso: false, erro: 'Rota não encontrada.', mensagem: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ sucesso: false, erro: 'Dados enviados em formato inválido.', mensagem: 'Dados enviados em formato inválido.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ sucesso: false, erro: 'Os dados enviados são grandes demais.', mensagem: 'Os dados enviados são grandes demais.' });
  }
  console.error('Erro não tratado:', erro);
  res.status(500).json({ sucesso: false, erro: 'Erro interno no servidor.', mensagem: 'Erro interno no servidor.' });
});

// ==========================================
// 5. INICIA O SERVIDOR (PORTA 8080 PARA O FRONTEND)
// ==========================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;