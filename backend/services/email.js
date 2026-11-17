// Envio de e-mail. Duas formas, escolhidas pelas variáveis de ambiente:
//
// 1) BREVO_API_KEY -> API HTTP da Brevo (https://www.brevo.com, grátis até 300 e-mails/dia).
//    Use esta no Render gratuito: ele BLOQUEIA as portas SMTP (25, 465 e 587), então o
//    Gmail por SMTP não sai de lá. EMAIL_REMETENTE precisa ser um remetente verificado na
//    Brevo (pode ser o Gmail da loja). Aceita "Nome <email@x.com>" ou só o e-mail.
// 2) SMTP_HOST (+ SMTP_PORT padrão 587, SMTP_USER, SMTP_PASS) -> SMTP comum (Gmail com
//    senha de app, etc.). Funciona no computador e em hospedagens que liberam SMTP.
//
// Sem nenhuma das duas (ex.: desenvolvimento) o e-mail não sai: o conteúdo vai para o log.
const nodemailer = require('nodemailer');

let transporte = null;
function obterTransporte() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporte) {
    const porta = Number(process.env.SMTP_PORT) || 587;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transporte;
}

// "Loja <loja@gmail.com>" -> { name: 'Loja', email: 'loja@gmail.com' }
function separarRemetente(texto) {
  const m = String(texto || '').match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return m[1] ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: m[2] };
  return { name: 'FlexWash', email: String(texto || '').trim() };
}

async function enviarPelaBrevo({ para, assunto, texto, html }) {
  const remetente = process.env.EMAIL_REMETENTE || process.env.SMTP_USER;
  if (!remetente) throw new Error('EMAIL_REMETENTE não definido (obrigatório com BREVO_API_KEY).');

  const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: separarRemetente(remetente),
      to: [{ email: para }],
      subject: assunto,
      textContent: texto,
      htmlContent: html || undefined
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`Brevo respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`);
  }
}

async function enviar({ para, assunto, texto, html }) {
  if (process.env.BREVO_API_KEY) {
    await enviarPelaBrevo({ para, assunto, texto, html });
    return { enviado: true };
  }

  const t = obterTransporte();
  if (!t) {
    console.log(`[email] E-mail não configurado. E-mail para ${para}: ${assunto}\n${texto}`);
    return { enviado: false, simulado: true };
  }
  await t.sendMail({
    from: process.env.EMAIL_REMETENTE || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html
  });
  return { enviado: true };
}

module.exports = { enviar, separarRemetente };
