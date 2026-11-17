import React, { useState } from 'react';
import { Plus, Car, CalendarClock, ParkingSquare, Droplets, Wallet, Truck, Trash2, ArrowRight, CheckCircle2, User, Users, Pencil, RefreshCw, CalendarX, Undo2, PackageCheck, MapPin, Phone } from 'lucide-react';
import ModalNovaLavagem from '../componentes/ModalNovaLavagem';
import ModalEquipe from '../componentes/ModalEquipe';
import { useGestaoPatio } from '../hooks/useGestaoPatio'; // Importamos o "cérebro"

// 'AAAA-MM-DD HH:MM' -> { data: 'DD/MM', hora: 'HH:MM' }
const separarAgendamento = (texto) => {
  if (!texto) return null;
  const [dia, hora] = texto.split(' ');
  const [, mes, d] = dia.split('-');
  return { data: `${d}/${mes}`, hora };
};

// Minutos de atraso de um agendado ('AAAA-MM-DD HH:MM', hora local) em relação a agora.
// Tolerância de 15 min antes de marcar como atrasado.
const TOLERANCIA_ATRASO_MIN = 15;
const minutosDeAtraso = (texto) => {
  if (!texto) return 0;
  const [dia, hora] = texto.split(' ');
  const [a, m, d] = dia.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const diff = Math.floor((Date.now() - new Date(a, m - 1, d, h, min).getTime()) / 60000);
  return diff > TOLERANCIA_ATRASO_MIN ? diff : 0;
};
const textoAtraso = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`);

const moeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Etapas do leva e traz (por pedido)
const ETAPA_LOGISTICA = {
  a_buscar: { texto: 'A buscar', cor: 'bg-ouro-100 text-ouro-800' },
  buscando: { texto: 'Buscando', cor: 'bg-marca-100 text-marca-800' },
  coletado: { texto: 'No lava-rápido', cor: 'bg-verde-100 text-verde-800' },
  entregando: { texto: 'Saiu para entregar', cor: 'bg-marca-100 text-marca-800' },
  entregue: { texto: 'Entregue', cor: 'bg-verde-100 text-verde-800' },
};
const primeiroNome = (nome) => String(nome || '').split(' ')[0];

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
    trocarEquipe,
    excluirServico,
    cancelarAgendamento,
    entregas,
    mudarLogistica
  } = useGestaoPatio(abrirAlerta);

  // 2. Estado apenas para controlar se a janelinha (modal) está aberta ou fechada
  const [modalLavagemAberto, setModalLavagemAberto] = useState(false);
  // No celular as colunas viram abas
  // Até a pessoa escolher uma aba, abre na primeira que tem carro (fila, lavando, chegam hoje)
  const [colunaEscolhida, setColunaCelular] = useState(null);
  const colunaCelular = colunaEscolhida
    || ['Aguardando', 'Em Andamento', 'Agendado'].find((st) => listaPatio.some((item) => item.status === st))
    || 'Aguardando';
  // Escolha da equipe: { item, modo: 'iniciar' | 'trocar' }
  const [equipeAberta, setEquipeAberta] = useState(null);
  // Escolha do motorista do leva e traz: { agendamentoId, etapa, descricao, motoristaId }
  const [motoristaAberto, setMotoristaAberto] = useState(null);

  const idsDaEquipe = (item) => String(item.responsaveis_ids || '').split(',').filter(Boolean).map(Number);

  // "Iniciar lavagem" pergunta antes quem vai lavar (é quem recebe a comissão)
  const clicarAvancar = (item) => {
    if (item.status === 'Aguardando') setEquipeAberta({ item, modo: 'iniciar' });
    else avancarStatusServico(item.id, item.status);
  };

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
      ? { nome: 'Faturamento hoje', valor: moeda(metricas.faturamentoHoje), icone: Wallet, cor: 'bg-verde-50 text-verde-600', dica: 'Inclui os carros já concluídos' }
      : { nome: 'Chegam hoje', valor: metricas.statusPatio.agendados, icone: CalendarClock, cor: 'bg-marca-50 text-marca-600' },
  ];

  const cartao = (item, coluna) => {
    const agendado = separarAgendamento(item.data_agendamento);
    const atraso = item.status === 'Agendado' ? minutosDeAtraso(item.data_agendamento) : 0;
    const Botao = coluna.botao.icone;
    return (
      <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-suave ${atraso > 0 ? 'border-red-300' : 'border-tinta-200/80'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-tinta-950">{item.marca} {item.modelo}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-md border border-tinta-300 bg-tinta-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-tinta-800">{item.placa}</span>
              <span className="text-xs text-tinta-500">Porte {item.porte}</span>
            </div>
          </div>
          <span className={`shrink-0 text-xs font-semibold ${atraso > 0 ? 'text-red-700' : 'text-tinta-500'}`}>
            {/* Agendado: a hora marcada. Entrada de balcão: a hora em que entrou no pátio.
                (criado_em de um agendado é a hora em que o cliente marcou, então não serve aqui) */}
            {item.status === 'Agendado'
              ? agendado?.hora
              : item.status === 'Em Andamento' && item.inicio_em
                ? `lavando desde ${horaDe(item.inicio_em)}`
                : item.chegada_em
                  ? `entrou ${horaDe(item.chegada_em)}`
                  : agendado ? `marcado ${agendado.hora}` : `entrou ${horaDe(item.data_entrada)}`}
          </span>
        </div>

        {atraso > 0 && (
          <p className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
            Atrasado {textoAtraso(atraso)}
          </p>
        )}

        <div className="mt-3 space-y-1.5 text-sm">
          <p className="flex items-center gap-2 text-tinta-700"><User size={14} className="shrink-0 text-tinta-400" /><span className="truncate">{item.cliente_nome}</span></p>
          <p className="text-tinta-900">
            <span className="font-medium">{item.pacote_nome || 'Sem pacote'}</span>
            {item.servicos_extras && <span className="text-verde-700"> + {item.servicos_extras}</span>}
          </p>
          {item.status !== 'Agendado' && (
            <p className="flex items-center gap-2 text-xs text-tinta-600">
              <Users size={14} className="shrink-0 text-tinta-400" />
              <span className="truncate">{item.responsaveis || <span className="italic text-tinta-400">Equipe não definida</span>}</span>
              {podeOperar && item.responsaveis && (
                <button onClick={() => setEquipeAberta({ item, modo: 'trocar' })} className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Trocar equipe" aria-label="Trocar equipe">
                  <Pencil size={13} />
                </button>
              )}
            </p>
          )}
          {item.tipo_logistica === 'leva_tras' && (
            <div className="rounded-lg bg-ouro-50 px-2.5 py-2 text-xs text-ouro-800">
              <p className="flex items-start gap-2">
                <Truck size={14} className="mt-px shrink-0" />
                <span className="min-w-0 flex-1">Leva e traz: {item.endereco_busca}{item.cliente_telefone && <><br />{item.cliente_telefone}</>}</span>
                {ETAPA_LOGISTICA[item.logistica_status] && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${ETAPA_LOGISTICA[item.logistica_status].cor}`}>
                    {ETAPA_LOGISTICA[item.logistica_status].texto}
                  </span>
                )}
              </p>
              {item.status === 'Agendado' && item.logistica_status === 'buscando' && (
                <p className="mt-1.5 flex items-center gap-2 pl-[22px] font-semibold">
                  {primeiroNome(item.motorista_nome) || 'Motorista'} a caminho do cliente
                  {podeOperar && (
                    <button onClick={() => mudarLogistica(item.agendamento_id, 'a_buscar')} className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-ouro-700 hover:bg-ouro-100" title="Ainda não saiu">
                      <Undo2 size={13} /> Desfazer
                    </button>
                  )}
                </p>
              )}
              {podeOperar && item.status === 'Agendado' && item.logistica_status === 'a_buscar' && (
                <button
                  onClick={() => setMotoristaAberto({ agendamentoId: item.agendamento_id, etapa: 'buscando', descricao: `${item.cliente_nome} · ${item.endereco_busca || ''}`, motoristaId: item.motorista_id })}
                  className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-white font-semibold text-ouro-800 ring-1 ring-ouro-200 hover:bg-ouro-100"
                >
                  <Truck size={14} /> Saiu para buscar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-tinta-200 pt-3">
          <span className="font-display text-lg font-extrabold text-tinta-950">{moeda(item.valor_total)}</span>
          <div className="flex gap-1">
            {podeOperar && item.status === 'Agendado' && (
              <button onClick={() => cancelarAgendamento(item)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-tinta-500 hover:bg-red-50 hover:text-red-700" title="Cancelar agendamento">
                <CalendarX size={16} /> Cancelar
              </button>
            )}
            {ehAdmin && (
              <button onClick={() => excluirServico(item.id)} className="fw-btn-perigo" title="Excluir serviço" aria-label="Excluir serviço">
                <Trash2 size={17} />
              </button>
            )}
          </div>
        </div>

        {podeOperar && (
          <button onClick={() => clicarAvancar(item)} className={`${coluna.botao.classe} mt-3 h-10 w-full`}>
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

      {/* Leva e traz: carros prontos para voltar ao cliente */}
      {podeOperar && entregas.length > 0 && (
        <section className="fw-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-tinta-100 px-4 py-4 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-tinta-950"><Truck size={18} className="text-ouro-600" /> Para devolver</h2>
              <p className="text-sm text-tinta-500">Leva e traz com todos os carros prontos.</p>
            </div>
            <span className="rounded-full bg-ouro-50 px-2.5 py-1 text-xs font-bold text-ouro-700">{entregas.length}</span>
          </div>
          <ul className="divide-y divide-tinta-100">
            {entregas.map((e) => (
              <li key={e.agendamento_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-tinta-950">{e.cliente_nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ETAPA_LOGISTICA[e.logistica_status]?.cor || ''}`}>
                      {e.logistica_status === 'entregando' ? `${primeiroNome(e.motorista_nome) || 'Motorista'} a caminho` : 'Pronto para sair'}
                    </span>
                  </p>
                  <p className="text-tinta-700">{e.carros.join(', ')}</p>
                  <p className="flex items-start gap-1.5 text-xs text-tinta-500"><MapPin size={13} className="mt-px shrink-0" />{e.endereco_busca}</p>
                  {e.cliente_telefone && <p className="flex items-center gap-1.5 text-xs text-tinta-500"><Phone size={13} className="shrink-0" />{e.cliente_telefone}</p>}
                </div>
                {e.logistica_status === 'coletado' ? (
                  <button
                    onClick={() => setMotoristaAberto({ agendamentoId: e.agendamento_id, etapa: 'entregando', descricao: `${e.cliente_nome} · ${e.endereco_busca || ''}`, motoristaId: e.motorista_id })}
                    className="fw-btn-escuro h-10 shrink-0"
                  >
                    <Truck size={16} /> Saiu para entregar
                  </button>
                ) : (
                  <button onClick={() => mudarLogistica(e.agendamento_id, 'entregue')} className="fw-btn h-10 shrink-0 bg-verde-600 text-white hover:bg-verde-700">
                    <PackageCheck size={16} /> Entregue
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    {podeOperar && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => cancelarAgendamento(item)} className="grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Cancelar agendamento" aria-label="Cancelar agendamento">
                          <CalendarX size={17} />
                        </button>
                        {ehAdmin && (
                          <button onClick={() => excluirServico(item.id)} className="fw-btn-perigo" title="Excluir agendamento" aria-label="Excluir agendamento">
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {equipeAberta && (
        <ModalEquipe
          titulo={equipeAberta.modo === 'iniciar' ? 'Quem vai lavar?' : 'Trocar equipe'}
          descricao={`${equipeAberta.item.marca} ${equipeAberta.item.modelo} · ${equipeAberta.item.placa}`}
          selecionadosIniciais={idsDaEquipe(equipeAberta.item)}
          textoConfirmar={equipeAberta.modo === 'iniciar' ? 'Iniciar lavagem' : 'Salvar equipe'}
          aoFechar={() => setEquipeAberta(null)}
          aoConfirmar={async (ids) => {
            const { item, modo } = equipeAberta;
            setEquipeAberta(null);
            if (modo === 'iniciar') await avancarStatusServico(item.id, item.status, ids);
            else await trocarEquipe(item.id, ids);
          }}
        />
      )}

      {motoristaAberto && (
        <ModalEquipe
          unico
          icone={Truck}
          titulo={motoristaAberto.etapa === 'buscando' ? 'Quem vai buscar?' : 'Quem vai entregar?'}
          descricao={motoristaAberto.descricao}
          selecionadosIniciais={motoristaAberto.motoristaId ? [motoristaAberto.motoristaId] : []}
          textoConfirmar={motoristaAberto.etapa === 'buscando' ? 'Saiu para buscar' : 'Saiu para entregar'}
          nota="O cliente vê o nome do motorista no app."
          aoFechar={() => setMotoristaAberto(null)}
          aoConfirmar={async ([id]) => {
            const { agendamentoId, etapa } = motoristaAberto;
            setMotoristaAberto(null);
            await mudarLogistica(agendamentoId, etapa, id);
          }}
        />
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
