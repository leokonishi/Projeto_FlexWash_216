require('dotenv').config();

// Segredo único usado para ASSINAR (login) e VERIFICAR (middleware) os tokens.
// Fica apenas na variável de ambiente JWT_SECRET: nunca no código-fonte.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET ausente ou curto demais (minimo 32 caracteres). ' +
    'Defina no backend/.env e nas variaveis de ambiente do servidor de deploy. ' +
    "Para gerar um: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
}

module.exports = { JWT_SECRET };
