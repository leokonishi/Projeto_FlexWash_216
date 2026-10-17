const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();

// Certificado da Aiven (ca.pem). Duas formas de informar, ambas opcionais:
//   DB_SSL_CA      -> conteúdo do certificado (útil em hosts onde não dá para subir arquivos; "\n" literal é aceito)
//   DB_SSL_CA_PATH -> caminho do arquivo, relativo à pasta backend/ (ex.: certs/ca.pem)
// Com o certificado, a conexão valida o servidor. Sem ele, mantém o comportamento antigo
// (cifrada, mas sem validar a identidade do servidor) e avisa no log.
function montarSsl() {
  let ca;

  if (process.env.DB_SSL_CA) {
    ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  } else if (process.env.DB_SSL_CA_PATH) {
    const caminho = path.resolve(__dirname, process.env.DB_SSL_CA_PATH);
    if (!fs.existsSync(caminho)) {
      // Falha alto de propósito: configurar o certificado e ele não ser usado seria uma falsa segurança.
      throw new Error(`DB_SSL_CA_PATH aponta para um arquivo que não existe: ${caminho}`);
    }
    ca = fs.readFileSync(caminho, 'utf8');
  }

  if (ca) return { ca, rejectUnauthorized: true };

  console.warn(
    '[bd] Aviso: DB_SSL_CA / DB_SSL_CA_PATH não definidos; a conexão com o banco não valida o certificado do servidor. ' +
    'Baixe o ca.pem no painel da Aiven e configure uma das duas variáveis.'
  );
  return { rejectUnauthorized: false };
}

// Pool: reaproveita várias conexões e reabre sozinho as que caem por inatividade
// (a conexão única anterior ficava morta até reiniciar o servidor).
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  ssl: montarSsl(),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

const poolPromise = pool.promise();

// Teste de conexão só para o log; não derruba o servidor se o banco estiver fora do ar.
poolPromise
  .query('SELECT 1')
  .then(() => console.log('Pool MySQL conectado com sucesso!'))
  .catch((err) => console.error('Erro ao conectar no MySQL:', err.message));

// Mesma interface usada hoje (execute/query) + getConnection() para transações.
module.exports = poolPromise;
