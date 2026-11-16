// Envio de e-mail por SMTP (Gmail, Resend, Brevo, etc.).
// Variáveis: SMTP_HOST, SMTP_PORT (padrão 587), SMTP_USER, SMTP_PASS, EMAIL_REMETENTE.
// Sem SMTP_HOST (ex.: ambiente de desenvolvimento) o e-mail não sai: o conteúdo vai para o log.
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

async function enviar({ para, assunto, texto, html }) {
  const t = obterTransporte();
  if (!t) {
    console.log(`[email] SMTP não configurado. E-mail para ${para}: ${assunto}\n${texto}`);
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

module.exports = { enviar };
