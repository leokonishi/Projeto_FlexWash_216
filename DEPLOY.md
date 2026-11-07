# Publicar o FlexWash online

Arquitetura (tudo com plano gratuito):

| Parte | Onde | Endereço de exemplo |
|---|---|---|
| Banco MySQL | Aiven (já existe) | `mysql-xxxx.aivencloud.com:12345` |
| Backend (Node/Express) | Render | `https://flexwash-api.onrender.com` |
| Frontend (React/Vite) | Vercel | `https://flexwash.vercel.app` |

A ordem importa: primeiro o backend (para ter a URL da API), depois o frontend (que precisa dessa URL no build), e por fim o CORS do backend apontando para a URL do frontend.

## 1. Dados da Aiven

No painel da Aiven, abra o serviço MySQL e copie de **Connection information**: Host, Port, User, Password e Database name (normalmente `defaultdb`, ou o banco que você criou).
Baixe também o **CA certificate** (`ca.pem`) e abra no Bloco de Notas: o conteúdo vai na variável `DB_SSL_CA`.

## 2. Backend no Render

1. Entre em https://render.com com a conta do GitHub.
2. **New > Blueprint**, escolha o repositório `Projeto_FlexWash_216`. O Render lê o `render.yaml` da raiz e cria o serviço `flexwash-api`.
3. Ele pede os valores marcados como secretos:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: os da Aiven.
   - `DB_SSL_CA`: cole o conteúdo inteiro do `ca.pem` (de `-----BEGIN CERTIFICATE-----` até `-----END CERTIFICATE-----`).
   - `CORS_ORIGIN`: deixe vazio por enquanto (preenche no passo 4).
   - `JWT_SECRET` é gerado sozinho.
4. Aguarde o deploy. Teste abrindo `https://SEU-SERVICO.onrender.com/api/saude`: deve mostrar `{"ok":true,"banco":"conectado"}`.

Se preferir criar sem Blueprint: **New > Web Service**, Root Directory `backend`, Build `npm ci`, Start `npm start`, Health Check Path `/api/saude`, e as mesmas variáveis.

> O plano gratuito do Render "dorme" após 15 minutos sem uso; a primeira chamada depois disso demora uns 50 segundos.

## 3. Frontend na Vercel

1. Entre em https://vercel.com com a conta do GitHub.
2. **Add New > Project**, escolha o repositório.
3. **Root Directory**: `frontend` (o framework Vite é detectado sozinho).
4. Em **Environment Variables** adicione `VITE_API_URL` = URL do Render, sem barra no final (ex.: `https://flexwash-api.onrender.com`).
5. **Deploy**. O `vercel.json` já faz as rotas do React (ex.: `/admin`) funcionarem ao recarregar a página.

> Se mudar `VITE_API_URL` depois, faça **Redeploy**: o valor entra no build.

## 4. Fechar o CORS

Volte ao Render, em **Environment**, preencha `CORS_ORIGIN` com a URL da Vercel (ex.: `https://flexwash.vercel.app`, sem barra). Mais de uma: separe por vírgula. Salve; o Render reinicia sozinho.

## 5. Conferir

- `https://SEU-SERVICO.onrender.com/api/saude` responde `ok: true`.
- Login de cliente, login da equipe, pátio, agendamento e histórico funcionando pela URL da Vercel.
- Erro de CORS no console do navegador: confira se `CORS_ORIGIN` é exatamente a URL da Vercel.
- Erro de banco no log do Render: confira as variáveis `DB_*` e se o serviço da Aiven está ligado (o plano gratuito pode desligar por inatividade; ligue de novo no painel).
