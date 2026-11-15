import { useEffect, useRef } from 'react';

// Chama `atualizar` a cada `intervaloMs` enquanto a aba está visível, e logo que a pessoa
// volta para a aba. Mantém a tela do cliente e o pátio em dia sem precisar recarregar.
// Com a aba escondida não chama nada (economiza bateria e o banco).
export function useAtualizacaoAutomatica(atualizar, intervaloMs = 20000, ativo = true) {
  const ref = useRef(atualizar);
  ref.current = atualizar;

  useEffect(() => {
    if (!ativo) return undefined;
    const rodar = () => {
      if (document.visibilityState === 'visible') ref.current();
    };
    const timer = setInterval(rodar, intervaloMs);
    document.addEventListener('visibilitychange', rodar);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', rodar);
    };
  }, [intervaloMs, ativo]);
}
