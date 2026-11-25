// Limite simples de pedidos por IP, em memória, para as rotas públicas que disparam e-mail
// ou criam cadastro (sem ele, alguém pode gastar a cota diária da Brevo ou encher o banco).
// Reiniciar o servidor zera a contagem: suficiente para uma instância só.

// Cria um contador: no máximo `max` usos por IP a cada `janelaMs`.
function criarLimite({ max, janelaMs }) {
  const usos = new Map(); // ip -> { total, desde }

  const atual = (ip, agora) => {
    const u = usos.get(ip);
    if (!u || agora - u.desde >= janelaMs) return null;
    return u;
  };

  // Conta um uso. Devolve 0 se pode seguir, ou os minutos que faltam para liberar.
  function consumir(ip, agora = Date.now()) {
    const chave = ip || '?';
    const u = atual(chave, agora) || { total: 0, desde: agora };
    if (u.total >= max) return Math.max(1, Math.ceil((u.desde + janelaMs - agora) / 60000));
    u.total += 1;
    usos.set(chave, u);
    return 0;
  }

  const timer = setInterval(() => {
    const agora = Date.now();
    for (const ip of usos.keys()) if (!atual(ip, agora)) usos.delete(ip);
  }, janelaMs);
  timer.unref();

  // Middleware do Express: responde 429 quando o IP passou do limite
  function middleware(req, res, next) {
    const minutos = consumir(req.ip);
    if (minutos) {
      const mensagem = `Muitos pedidos seguidos deste aparelho. Tente de novo em ${minutos} min.`;
      return res.status(429).json({ sucesso: false, mensagem, erro: mensagem });
    }
    next();
  }

  return { consumir, middleware };
}

// Limites usados nas rotas públicas (por IP, por hora)
const HORA = 60 * 60 * 1000;
const emailsPublicos = criarLimite({ max: 10, janelaMs: HORA });  // "esqueci a senha" (cliente e equipe)
const cadastroPublico = criarLimite({ max: 10, janelaMs: HORA }); // auto-cadastro do cliente

module.exports = { criarLimite, emailsPublicos, cadastroPublico };
