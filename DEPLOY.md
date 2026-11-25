# Publicar o FlexWash online

Tudo no plano gratuito:

| Parte | Onde | Endereço de exemplo |
|---|---|---|
| Banco MySQL | Aiven (já existe) | `mysql-xxxx.aivencloud.com:12345` |
| Backend (Node/Express) | Render | `https://flexwash-api.onrender.com` |
| Frontend (React/Vite) | Vercel | `https://flexwash.vercel.app` |
| E-mail (link de criar senha) | Brevo, pela API HTTP | remetente: o Gmail da loja |

Ordem: backend primeiro (para ter a URL da API), depois o frontend (que precisa dessa URL no build), e por fim voltar ao Render para colocar a URL do frontend (CORS e links de e-mail).

> **Por que Brevo e não o Gmail direto?** O Render gratuito bloqueia as portas SMTP (25, 465 e 587), então o Gmail por SMTP dá timeout lá. A Brevo envia por HTTPS, que não é bloqueado, e pode usar o próprio Gmail da loja como remetente. No computador o SMTP do Gmail continua funcionando normalmente.

## 1. Dados da Aiven

No painel da Aiven, abra o serviço MySQL e copie de **Connection information**: Host, Port, User, Password e Database name.
Baixe também o **CA certificate** (`ca.pem`) e abra no Bloco de Notas: o conteúdo inteiro vai na variável `DB_SSL_CA`.

## 2. Conta na Brevo (e-mail)

1. Crie a conta em https://www.brevo.com (grátis, 300 e-mails por dia).
2. **Senders, Domains & Dedicated IPs > Senders > Add a sender**: coloque o Gmail da loja e confirme o código que chega nele.
3. **SMTP & API > API Keys > Generate a new API key**: copie a chave (começa com `xkeysib-`).

## 3. Backend no Render

1. Entre em https://render.com com a conta do GitHub (a que tem acesso ao repositório).
2. **New > Blueprint**, escolha o repositório `Projeto_FlexWash_216`. O Render lê o `render.yaml` e cria o serviço `flexwash-api`.
3. Preencha o que ele pedir:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: os da Aiven.
   - `DB_SSL_CA`: o conteúdo do `ca.pem`, de `-----BEGIN CERTIFICATE-----` até `-----END CERTIFICATE-----`.
   - `EMAIL_REMETENTE`: `Lava Rápido Flex <gmail.da.loja@gmail.com>` (o remetente verificado na Brevo).
   - `BREVO_API_KEY`: a chave da Brevo.
   - `CORS_ORIGIN` e `APP_URL`: deixe vazios por enquanto (passo 5).
   - `JWT_SECRET`, `TRUST_PROXY` e `DB_POOL_LIMIT` já vêm preenchidos.
4. Aguarde o deploy e abra `https://SEU-SERVICO.onrender.com/api/saude`. Deve aparecer `{"ok":true,"banco":"conectado"}`.

Sem Blueprint: **New > Web Service**, Root Directory `backend`, Build `npm ci`, Start `npm start`, Health Check Path `/api/saude`, e as mesmas variáveis.

> O plano gratuito "dorme" depois de 15 minutos sem uso; o primeiro acesso depois disso demora uns 50 segundos.

## 4. Frontend na Vercel

1. Entre em https://vercel.com com a conta do GitHub.
2. **Add New > Project**, escolha o repositório.
3. **Root Directory**: `frontend` (o Vite é detectado sozinho).
4. **Environment Variables**: `VITE_API_URL` = a URL do Render, sem barra no final.
5. **Deploy**. O `vercel.json` já faz as rotas `/cliente/...` e `/gestao/...` abrirem ao recarregar a página.

> Mudou `VITE_API_URL` depois? Faça **Redeploy**: o valor entra no build.

## 5. Ligar um no outro

No Render, em **Environment**, preencha com a URL da Vercel (sem barra no final) e salve:
- `CORS_ORIGIN` = `https://flexwash.vercel.app` (mais de uma: separe por vírgula)
- `APP_URL` = `https://flexwash.vercel.app` (usada no link do e-mail de criar senha)

## 6. Conferir

- `/api/saude` responde `ok: true`.
- Pela URL da Vercel: cadastro e login de cliente, login da equipe em `/gestao/login`, pátio, agendamento e histórico.
- Cadastre um cliente no balcão com um e-mail seu e veja se o link de criar senha chega e abre na Vercel.

Problemas comuns:
- **Erro de CORS no console do navegador**: `CORS_ORIGIN` diferente da URL da Vercel (confira https e barra no final).
- **`/api/saude` com `ok: false`**: variáveis `DB_*` erradas, ou o serviço da Aiven desligado (o plano gratuito desliga por inatividade; ligue de novo no painel).
- **E-mail não chega**: veja o log do Render. `Brevo respondeu 401` é chave errada; `400` com "sender" é remetente não verificado.

## 7. Proteções extras do site (opcional, no painel do Render)

O site já sai do build com uma política de segurança (CSP) que só deixa rodar scripts do próprio
site. Para também impedir que outra página abra o FlexWash dentro de um iframe, no Static Site
do Render vá em **Settings > Headers** e adicione, no caminho `/*`:

| Nome | Valor |
| --- | --- |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

## 8. Servidor dormindo (plano grátis)

No plano grátis o backend dorme após 15 min sem uso e leva até ~1 min para voltar; o site mostra
a faixa "Ligando o servidor…" enquanto isso. Para mantê-lo acordado, um monitor gratuito
(ex.: cron-job.org ou UptimeRobot) pode chamar `https://flexwash-api.onrender.com/api/saude` a
cada 10 min. As 750 h grátis por mês só cobrem **um** serviço ligado o tempo todo: apague
serviços duplicados antes.
