import { lerToken, obterPerfil, encerrarSessao, rotaDeLogin } from './sessao';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Substituto do fetch para chamadas à NOSSA API:
//  - anexa o token (Authorization: Bearer) automaticamente;
//  - se o backend responder 401 (token ausente/expirado), encerra a sessão e volta ao login.
// URLs externas (ex.: Tabela FIPE) passam direto, sem enviar o token a terceiros.
export async function apiFetch(url, opcoes = {}) {
  if (!String(url).startsWith(API_URL)) return fetch(url, opcoes);

  const headers = new Headers(opcoes.headers || {});
  const token = lerToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const resposta = await fetch(url, { ...opcoes, headers });

  if (resposta.status === 401) {
    const destino = rotaDeLogin(obterPerfil());
    encerrarSessao();
    window.location.assign(destino);
  }

  return resposta;
}
