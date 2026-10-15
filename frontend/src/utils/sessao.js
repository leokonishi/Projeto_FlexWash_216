// Utilitários de sessão.
// ATENÇÃO: aqui o token é apenas DECODIFICADO (não verificado) para decidir o que mostrar na tela.
// Quem realmente protege os dados é o backend, que valida a assinatura em toda requisição.

const CHAVE_TOKEN = 'token_flexwash';

export function lerToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

// Retorna { id, email, perfil, exp } ou null se não houver token válido/não expirado.
export function obterSessao() {
  const token = lerToken();
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));

    if (!payload.perfil) return null;
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;

    return { id: payload.id, email: payload.email, perfil: payload.perfil, exp: payload.exp };
  } catch {
    return null;
  }
}

export function obterPerfil() {
  return obterSessao()?.perfil ?? null;
}

export function encerrarSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem('perfil_flexwash'); // chave antiga, mantida só para limpeza
}

// Tela de login correspondente ao perfil
export function rotaDeLogin(perfil) {
  return perfil === 'cliente' ? '/login' : '/gestao/LoginGestao';
}
