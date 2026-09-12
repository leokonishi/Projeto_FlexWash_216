import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Importando as rotas de teste existentes
import testeRoutes from './routes/testeRoutes.js';

dotenv.config();

console.log("Minha chave secreta está carregada.");

const app = express();

// CORS configurado para aceitar requisições da Vercel e ambientes de desenvolvimento
const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// Ligando as rotas de teste com o prefixo "/api"
app.use('/api', testeRoutes);

// Rota raiz de verificação
app.get('/', (req, res) => {
  res.json({ message: 'API rodando com CORS configurado!' });
});

// ==========================================
// NOVAS ROTAS DO PAINEL ADMINISTRATIVO
// ==========================================

// Rota do Dashboard que envia as métricas e a lista do pátio em JSON
app.get('/api/dashboard', (req, res) => {
  res.json({
    metricas: {
      veiculosDoDia: 3,
      portes: { pequeno: 1, medio: 1, grande: 1 },
      faturamentoHoje: 725.00,
      statusPatio: { espera: 0, emAndamento: 1 },
      levaTrazTotal: 1
    },
    listaPatio: [
      {
        id: 1,
        veiculo: 'Honda Civic',
        placa: 'ABC1234 • PRETO',
        entrada: '19/05/2026 00:42',
        porte: 'Pequeno',
        cliente: 'Patrícia Menezes',
        telefone: '(11) 95544-3322',
        servico: 'Lavagem Simples',
        valor: 'R$ 40,00',
        responsavel: 'Marcos Souza',
        status: 'Em Andamento',
        levaTraz: true,
        enderecoLevaTraz: 'Rua das Flores, 123 - Barueri/SP'
      }
    ]
  });
});

// Rota para concluir um serviço do pátio
app.put('/api/lavagens/:id/concluir', (req, res) => {
  const { id } = req.params;
  res.json({ sucesso: true, mensagem: `Serviço ${id} concluído com sucesso!` });
});

// Rota de Login para autenticar o usuário
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  res.json({
    sucesso: true,
    mensagem: "Login realizado com sucesso!",
    token: "token_fake_flexwash_123456",
    usuario: {
      nome: "Gustavo Melo",
      cargo: "ADMINISTRADOR"
    }
  });
});

// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;