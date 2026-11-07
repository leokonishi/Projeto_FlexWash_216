// Título padrão das abas do painel, com ações opcionais à direita
export default function CabecalhoPagina({ titulo, subtitulo, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-tinta-950 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-sm text-tinta-500">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// Cartão com título, usado para agrupar formulários e listas
export function Secao({ titulo, subtitulo, icone: Icone, acoes, children, className = '', semPadding = false }) {
  return (
    <section className={`fw-card overflow-hidden ${className}`}>
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tinta-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-tinta-950">
              {Icone && <Icone size={18} className="text-marca-600" />} {titulo}
            </h2>
            {subtitulo && <p className="mt-0.5 text-sm text-tinta-500">{subtitulo}</p>}
          </div>
          {acoes}
        </div>
      )}
      <div className={semPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
