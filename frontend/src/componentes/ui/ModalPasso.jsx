import { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

const PASSOS = ['Veículos', 'Serviços', 'Modalidade', 'Horário'];

// Moldura dos passos do agendamento.
// No celular abre como uma folha que ocupa a tela, de baixo para cima;
// no computador, como um modal centralizado.
export default function ModalPasso({ passo, titulo, subtitulo, aoFechar, aoVoltar, rodape, children, largura = 'sm:max-w-xl' }) {
  // Trava a rolagem da página de fundo enquanto o modal está aberto
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-tinta-950/55 backdrop-blur-sm animate-surgir sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-elevada animate-subir sm:h-auto sm:max-h-[90vh] sm:rounded-3xl ${largura}`}
      >
        {/* Cabeçalho */}
        <div className="border-b border-tinta-100 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
          <div className="flex items-center gap-3">
            {aoVoltar ? (
              <button type="button" onClick={aoVoltar} className="-ml-2 grid size-10 place-items-center rounded-full text-tinta-600 hover:bg-tinta-100" aria-label="Voltar">
                <ArrowLeft size={20} />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              {passo && (
                <p className="text-xs font-semibold text-marca-600">
                  Passo {passo} de {PASSOS.length} · {PASSOS[passo - 1]}
                </p>
              )}
              <h2 className="truncate text-lg font-bold text-tinta-950 sm:text-xl">{titulo}</h2>
            </div>
            <button type="button" onClick={aoFechar} className="-mr-2 grid size-10 place-items-center rounded-full text-tinta-500 hover:bg-tinta-100 hover:text-tinta-900" aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          {passo && (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {PASSOS.map((nome, i) => (
                <span key={nome} className={`h-1.5 rounded-full transition-colors ${i < passo ? 'bg-marca-600' : 'bg-tinta-100'}`} />
              ))}
            </div>
          )}
          {subtitulo && <p className="mt-3 text-sm text-tinta-500">{subtitulo}</p>}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {/* Rodapé */}
        {rodape && (
          <div className="border-t border-tinta-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}

// Marcador redondo (rádio) ou quadrado (caixa) usado nas opções
export function Marcador({ ativo, redondo = false }) {
  return (
    <span
      className={`grid size-5 shrink-0 place-items-center border-2 transition-colors ${redondo ? 'rounded-full' : 'rounded-md'} ${
        ativo ? 'border-marca-600 bg-marca-600 text-white' : 'border-tinta-300 bg-white'
      }`}
    >
      {ativo && (redondo ? <span className="size-2 rounded-full bg-white" /> : (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg>
      ))}
    </span>
  );
}
