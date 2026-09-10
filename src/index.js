import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();
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

app.get('/', (req, res) => {
  res.json({ message: 'API rodando com CORS configurado!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;