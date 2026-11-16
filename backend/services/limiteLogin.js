// Limite de tentativas de login (cliente e equipe), em memória.
// - 5 senhas erradas seguidas no mesmo e-mail: bloqueia esse e-mail por 15 minutos.
// - 30 erros do mesmo IP em 15 minutos (vários e-mails): bloqueia o IP pelo resto da janela.
// Login certo zera o contador do e-mail. Reiniciar o servidor zera tudo
// (suficiente para uma instância só; com várias instâncias, mover para o banco ou Redis).
const MAX_POR_EMAIL = 5;
const MAX_POR_IP = 30;
const JANELA_MS = 15 * 60 * 1000;

const falhas = new Map(); // chave -> { total, desde, bloqueadoAte }

function estado(chave, agora) {
  const e = falhas.get(chave);
  if (!e) return null;
  if (e.bloqueadoAte && e.bloqueadoAte <= agora) { falhas.delete(chave); return null; }
  if (!e.bloqueadoAte && agora - e.desde > JANELA_MS) { falhas.delete(chave); return null; }
  return e;
}

const chaves = (tipo, email, ip) => [`${tipo}:email:${String(email || '').trim().toLowerCase()}`, `${tipo}:ip:${ip || '?'}`];

// Minutos que faltam para liberar, ou 0 se pode tentar
function minutosBloqueado(tipo, email, ip) {
  const agora = Date.now();
  const restante = chaves(tipo, email, ip)
    .map((k) => estado(k, agora))
    .filter((e) => e?.bloqueadoAte)
    .reduce((max, e) => Math.max(max, e.bloqueadoAte - agora), 0);
  return restante > 0 ? Math.ceil(restante / 60000) : 0;
}

// Registra uma senha errada. Devolve quantas tentativas ainda restam para o e-mail.
function registrarFalha(tipo, email, ip) {
  const agora = Date.now();
  const [kEmail, kIp] = chaves(tipo, email, ip);
  let restam = 0;
  for (const [k, max] of [[kEmail, MAX_POR_EMAIL], [kIp, MAX_POR_IP]]) {
    const e = estado(k, agora) || { total: 0, desde: agora, bloqueadoAte: null };
    e.total += 1;
    if (e.total >= max) e.bloqueadoAte = agora + JANELA_MS;
    falhas.set(k, e);
    if (k === kEmail) restam = Math.max(max - e.total, 0);
  }
  return restam;
}

function limparEmail(tipo, email) {
  falhas.delete(chaves(tipo, email)[0]);
}

// Limpeza periódica para o mapa não crescer sem fim
setInterval(() => {
  const agora = Date.now();
  for (const k of falhas.keys()) estado(k, agora);
}, JANELA_MS).unref();

module.exports = { minutosBloqueado, registrarFalha, limparEmail, MAX_POR_EMAIL };
