import { Sparkles, Clock3, Truck, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

const DESTAQUES = [
  { icone: Clock3, texto: 'Acompanhe a lavagem do seu carro em tempo real' },
  { icone: Truck, texto: 'Leva e traz: buscamos e entregamos o seu veículo' },
  { icone: ShieldCheck, texto: 'Agendamento em poucos toques, sem fila' },
];

// Tela de acesso do cliente (login e cadastro).
// Computador: painel da marca à esquerda e formulário à direita.
// Celular: faixa escura com a logo no topo e o formulário num cartão logo abaixo.
export default function LayoutAcesso({ titulo, subtitulo, children, rodape }) {
  return (
    <div className="fw-app min-h-[100dvh] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Painel da marca */}
      <aside className="relative overflow-hidden bg-tinta-950 px-6 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))] text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-marca-600/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-verde-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative">
          <Logo claro tamanho="md" />
        </div>

        <div className="relative mt-8 hidden lg:block">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ouro-300/30 bg-ouro-300/10 px-3 py-1 text-xs font-semibold text-ouro-200">
            <Sparkles size={13} /> Estética automotiva premium
          </span>
          <h1 className="mt-5 max-w-md text-4xl font-extrabold leading-[1.1] xl:text-5xl">
            Seu carro brilhando, <span className="bg-linear-to-r from-marca-300 to-verde-300 bg-clip-text text-transparent">sem perder tempo.</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {DESTAQUES.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-[15px] text-tinta-200">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-marca-300 ring-1 ring-white/10">
                  <Icone size={18} />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 hidden text-xs text-tinta-500 lg:block">© {new Date().getFullYear()} FlexWash · Gestão automotiva</p>
      </aside>

      {/* Formulário */}
      <main className="relative -mt-12 px-4 pb-10 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-12">
        <div className="fw-card mx-auto w-full max-w-md p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <h2 className="text-2xl font-bold text-tinta-950">{titulo}</h2>
          {subtitulo && <p className="mt-1.5 text-sm text-tinta-500">{subtitulo}</p>}
          <div className="mt-6">{children}</div>
          {rodape && <div className="mt-6 text-center text-sm text-tinta-500">{rodape}</div>}
        </div>
      </main>
    </div>
  );
}
