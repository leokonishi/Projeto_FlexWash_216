import React, { useState } from 'react';
import { Plus, Car, CalendarClock, ParkingSquare, Droplets, Wallet, Truck, Trash2, ArrowRight, CheckCircle2, User, RefreshCw } from 'lucide-react';
import ModalNovaLavagem from '../componentes/ModalNovaLavagem';
import { useGestaoPatio } from '../hooks/useGestaoPatio'; // Importamos o "cérebro"

// 'AAAA-MM-DD HH:MM' -> { data: 'DD/MM', hora: 'HH:MM' }
const separarAgendamento = (texto) => {
  if (!texto) return null;
  const [dia, hora] = texto.split(' ');
  const [, mes, d] = dia.split('-');
  return { data: `${d}/${mes}`, hora };
};

const moeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const horaDe = (dataIso) => (dataIso ? new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');

// Colunas do pátio, na ordem do fluxo, com o botão que leva o carro para a próxima
const COLUNAS = [
  {
    status: 'Agendado', nome: 'Chegam hoje', icone: CalendarClock,
    cor: 'bg-marca-50 text-marca-700', ponto: 'bg-marca-400',
    botao: { texto: 'Carro chegou', classe: 'fw-btn-escuro', icone: ArrowRight },
  },
  {
    status: 'Aguardando', nome: 'Na fila', icone: ParkingSquare,
    cor: 'bg-ouro-50 text-ouro-700', ponto: 'bg-ouro-400',
    botao: { texto: 'Iniciar lavagem', classe: 'fw-btn-primario', icone: Droplets },
  },
  {
    status: 'Em Andamento', nome: 'Lavando', icone: Droplets,
    cor: 'bg-marca-600 text-white', ponto: 'bg-white',
    botao: { texto: 'Concluir', classe: 'fw-btn bg-verde-600 text-white hover:bg-verde-700', icone: CheckCircle2 },
  },
];

export default function DashboardInicio({ perfilUsuario, abrirAlerta }) {
  // 1. Extraímos tudo que precisamos do nosso Custom Hook
  const {
    metricas,
    listaPatio,
    proximosAgendamentos,
    carregando,
    buscarDadosDoPatio,
    avancarStatusServico,
    excluirServico
  } = useGestaoPatio(abrirAlerta);

  // 2. Estado apenas para controlar se a janelinha (modal) está aberta ou fechada
  const [modalLavagemAberto, setModalLavagemAberto] = useState(false);
  // No celular as colunas viram abas
  const [colunaCelular, setColunaCelular] = useState('Aguardando');

  const ehAdmin = perfilUsuario === 'administrador';
  const podeOperar = perfilUsuario !== 'cliente';
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoje = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);

  const totalPortes = metricas.veiculosDoDia || 1;
  const portes = [
    ['P', metricas.portes.pequeno],
    ['M', metricas.portes.medio],
    ['G', metricas.portes.grande],
  ];

  const indicadores = [
    { nome: 'Carros hoje', valor: metricas.veiculosDoDia, icone: Car, cor: 'bg-tinta-100 text-tinta-700' },
    { nome: 'Na fila', valor: metricas.statusPatio.espera, icone: ParkingSquare, cor: 'bg-ouro-50 text-ouro-600' },
    { nome: 'Lavando', valor: metricas.statusPatio.emAndamento, icone: Droplets, cor: 'bg-marca-50 text-marca-600' },
    ehAdmin
      ? { nome: 'Faturamento hoje', valor: moeda(metricas.faturamentoHoje), icone: Wallet, cor: 'bg-verde-50 text-verde-600', dica: 'Carros que já chegaram' }
      : { nome: 'Chegam hoje', valor: metricas.statusPatio.agendados, icone: CalendarClock, cor: 'bg-marca-50 text-marca-600' },
  ];

  const cartao = (item, coluna) => {
    const agendado = separarAgendamento(item.data_agendamento);
    const Botao = coluna.botao.icone;
    return (
      <article key={item.id} className="rounded-2xl border border-tinta-200/80 bg-white p-4 shadow-suave">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-tinta-950">{item.marca} {item.modelo}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-md border border-tinta-300 bg-tinta-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-tinta-800">{item.placa}</span>
              <span className="text-xs text-tinta-500">Porte {item.porte}</span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-tinta-500">
            {item.status === 'Agendado' ? agendado?.hora : `desde ${horaDe(item.data_entrada)}`}
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <p className="flex items-center gap-2 text-tinta-700"><User size={14} className="shrink-0 text-tinta-400" /><span className="truncate">{item.cliente_nome}</span></p>
          <p className="text-tinta-900">
            <span className="font-medium">{item.pacote_nome || 'Sem pacote'}</span>
            {item.servicos_extras && <span className="text-verde-700"> + {item.servicos_extras}</span>}
          </p>
          {item.tipo_logistica === 'leva_tras' && (
            <p className="flex items-start gap-2 rounded-lg bg-ouro-50 px-2.5 py-1.5 text-xs text-ouro-700">
              <Truck size={14} className="mt-px shrink-0" />
              <span>Leva e traz: {item.endereco_busca}{item.cliente_telefone && <><br />{item.cliente_telefone}</>}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-tinta-200 pt-3">
          <span className="font-display text-lg font-extrabold text-tinta-950">{moeda(item.valor_total)}</span>
          {ehAdmin && (
            <button onClick={() => excluirServico(item.id)} className="fw-btn-perigo" title="Remover do pátio" aria-label="Remover do pátio">
              <Trash2 size={17} />
            </button>
          )}
        </div>

        {podeOperar && (
          <button onClick={() => avancarStatusServico(item.id, item.status)} className={`${coluna.botao.classe} mt-3 h-10 w-full`}>
            <Botao size={16} /> {coluna.botao.texto}
          </button>
        )}
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-tinta-500">{hoje}</p>
          <h1 className="text-2xl font-extrabold text-tinta-950 sm:text-3xl">Pátio de hoje</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={buscarDadosDoPatio} className="fw-btn-contorno px-3" aria-label="Atualizar" title="Atualizar">
            <RefreshCw size={17} className={carregando ? 'animate-spin' : ''} />
          </button>
          {podeOperar && (
            <button onClick={() => setModalLavagemAberto(true)} className="fw-btn-primario">
              <Plus size={18} /> Nova entrada
            </button>
          )}
        </div>
      </div>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {indicadores.map(({ nome, valor, icone: Icone, cor, dica }) => (
          <div key={nome} className="fw-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-tinta-500 sm:text-sm">{nome}</p>
              <span className={`grid size-8 place-items-center rounded-xl ${cor}`}><Icone size={16} /></span>
            </div>
            <p className="mt-2 truncate font-display text-2xl font-extrabold text-tinta-950 sm:text-3xl">{valor}</p>
            {nome === 'Carros hoje' ? (
              <div className="mt-2 flex items-center gap-2">
                {portes.map(([sigla, qtd]) => (
                  <span key={sigla} className="flex flex-1 items-center gap-1.5 text-[11px] font-semibold text-tinta-500">
                    {sigla}
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta-100">
                      <span className="block h-full rounded-full bg-marca-500" style={{ width: `${(qtd / totalPortes) * 100}%` }} />
                    </span>
                    {qtd}
                  </span>
                ))}
              </div>
            ) : dica ? (
              <p className="mt-2 text-xs text-tinta-400">{dica}</p>
            ) : null}
          </div>
        ))}
      </section>

      {/* Quadro do pátio */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-tinta-950">Fluxo do pátio</h2>
          <p className="hidden text-sm text-tinta-500 sm:block">Os agendados de hoje aparecem aqui até o carro chegar.</p>
        </div>

        {/* Abas das colunas (celular) */}
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-tinta-100 p-1 lg:hidden">
          {COLUNAS.map(col => {
            const qtd = listaPatio.filter(i => i.status === col.status).length;
            const ativo = colunaCelular === col.status;
            return (
              <button
                key={col.status}
                onClick={() => setColunaCelular(col.status)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all ${ativo ? 'bg-white text-tinta-950 shadow-sm' : 'text-tinta-500'}`}
              >
                {col.nome}
                <span className={`min-w-5 rounded-full px-1.5 text-[11px] ${ativo ? col.cor : 'bg-tinta-200 text-tinta-600'}`}>{qtd}</span>
              </button>
            );
          })}
        </div>

        {carregando && listaPatio.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="h-56 animate-pulse rounded-2xl bg-tinta-100" />)}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {COLUNAS.map(col => {
              const itens = listaPatio.filter(i => i.status === col.status);
              const Icone = col.icone;
              return (
                <div key={col.status} className={`rounded-3xl bg-tinta-100/70 p-3 ring-1 ring-tinta-200/60 ${colunaCelular === col.status ? '' : 'hidden lg:block'}`}>
                  <div className="mb-3 hidden items-center justify-between px-1 lg:flex">
                    <span className="flex items-center gap-2 text-sm font-bold text-tinta-800">
                      <Icone size={16} className="text-tinta-500" /> {col.nome}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${col.cor}`}>{itens.length}</span>
                  </div>
                  <div className="space-y-3">
                    {itens.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-tinta-200 px-4 py-10 text-center text-sm text-tinta-400">
                        Nenhum carro aqui
                      </div>
                    ) : itens.map(item => cartao(item, col))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Próximos agendamentos (a partir de amanhã) */}
      {podeOperar && (
        <section className="fw-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-tinta-100 px-4 py-4 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-tinta-950"><CalendarClock size={18} className="text-marca-600" /> Próximos agendamentos</h2>
              <p className="text-sm text-tinta-500">Próximos 7 dias. No dia marcado, entram no pátio.</p>
            </div>
            <span className="rounded-full bg-marca-50 px-2.5 py-1 text-xs font-bold text-marca-700">{proximosAgendamentos.length}</span>
          </div>
          {proximosAgendamentos.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-tinta-500">Nenhum agendamento nos próximos dias.</p>
          ) : (
            <ul className="divide-y divide-tinta-100">
              {proximosAgendamentos.map((item) => {
                const agendado = separarAgendamento(item.data_agendamento);
                return (
                  <li key={item.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                    <div className="w-14 shrink-0 rounded-xl bg-tinta-50 py-1.5 text-center ring-1 ring-tinta-200">
                      <p className="text-sm font-bold text-tinta-950">{agendado?.data}</p>
                      <p className="text-xs text-tinta-500">{agendado?.hora}</p>
                    </div>
                    <div className="grid min-w-0 flex-1 gap-x-6 gap-y-0.5 sm:grid-cols-[1.2fr_1fr_1.2fr]">
                      <p className="truncate font-semibold text-tinta-900">
                        {item.marca} {item.modelo} <span className="font-mono text-xs font-medium uppercase text-tinta-500">{item.placa}</span>
                      </p>
                      <p className="truncate text-sm text-tinta-600">{item.cliente_nome}{item.cliente_telefone && <span className="text-tinta-400"> · {item.cliente_telefone}</span>}</p>
                      <p className="truncate text-sm text-tinta-600">
                        {item.pacote_nome || 'Sem pacote'}{item.servicos_extras && <span className="text-verde-700"> + {item.servicos_extras}</span>}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="font-semibold text-tinta-900">{moeda(item.valor_total)}</p>
                      {item.tipo_logistica === 'leva_tras'
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-ouro-700"><Truck size={12} /> Leva e traz</span>
                        : <span className="text-xs text-tinta-500">Cliente leva</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {modalLavagemAberto && (
        <ModalNovaLavagem
          fecharModal={() => setModalLavagemAberto(false)}
          abrirAlerta={abrirAlerta}
          atualizarPatio={buscarDadosDoPatio}
        />
      )}
    </div>
  );
}
