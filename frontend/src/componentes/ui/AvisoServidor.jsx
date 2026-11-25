import React, { useEffect, useState } from 'react';
import { Loader2, CloudOff } from 'lucide-react';
import { API_URL } from '../../utils/api';

// No plano grátis do Render a API "dorme" depois de 15 min sem uso e leva até ~1 min para
// voltar. Ao abrir o site já acordamos a API (chamada em /api/saude) e, se ela demorar,
// mostramos uma faixa avisando, em vez de a pessoa achar que o login travou.
const MOSTRAR_APOS_MS = 2500;   // resposta rápida: nem aparece
const TENTAR_DE_NOVO_MS = 4000;
const DESISTIR_APOS_MS = 120000;

export default function AvisoServidor() {
  const [estado, setEstado] = useState('ok'); // ok | acordando | fora

  useEffect(() => {
    let ativo = true;
    let timerTentativa;
    const inicio = Date.now();
    const timerAviso = setTimeout(() => ativo && setEstado((e) => (e === 'ok' ? 'acordando' : e)), MOSTRAR_APOS_MS);

    const tentar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/saude`, { cache: 'no-store' });
        if (res.ok) {
          if (!ativo) return;
          clearTimeout(timerAviso);
          setEstado('ok');
          return;
        }
      } catch { /* servidor ainda subindo */ }
      if (!ativo) return;
      if (Date.now() - inicio > DESISTIR_APOS_MS) {
        clearTimeout(timerAviso);
        setEstado('fora');
        return;
      }
      timerTentativa = setTimeout(tentar, TENTAR_DE_NOVO_MS);
    };
    tentar();

    return () => {
      ativo = false;
      clearTimeout(timerAviso);
      clearTimeout(timerTentativa);
    };
  }, []);

  if (estado === 'ok') return null;
  const fora = estado === 'fora';

  return (
    <div role="status" aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[400] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-white shadow-elevada ${fora ? 'bg-red-600' : 'bg-tinta-950'}`}>
      {fora ? <CloudOff size={16} className="shrink-0" /> : <Loader2 size={16} className="shrink-0 animate-spin" />}
      <span>
        {fora
          ? 'Não conseguimos falar com o servidor. Confira sua internet e recarregue a página.'
          : 'Ligando o servidor… depois de um tempo parado, o primeiro acesso pode levar até 1 minuto.'}
      </span>
    </div>
  );
}
