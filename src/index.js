import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// 1. ADICIONE ESTA LINHA: Importando as rotas que criamos
import testeRoutes from './routes/testeRoutes.js';

dotenv.config();

// (Opcional: Você pode apagar esse console.log agora que já sabemos que funciona)
console.log("Minha chave secreta é:", process.env.JWT_SECRET);

const app = express();

// CORS configurado para o frontend Vite
const corsOptions = {
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// 2. ADICIONE ESTA LINHA: Ligando as rotas de teste com o prefixo "/api"
app.use('/api', testeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API rodando com CORS configurado!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;