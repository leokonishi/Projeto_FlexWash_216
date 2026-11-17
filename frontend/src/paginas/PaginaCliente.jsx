import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CalendarPlus, CalendarClock, Car, Droplets, Sparkles, CheckCircle2, ParkingSquare, History, CalendarX, Truck } from 'lucide-react';
import EscolhaServicoCliente from '../componentes/configCliente/EscolhaServicoCliente';
import EscolhaVeiculoCliente from '../componentes/configCliente/EscolhaVeiculoCliente';
import EscolhaLevaTrasCliente from '../componentes/configCliente/EscolhaLevaTrasCliente';
import EscolhaHorarioCliente from '../componentes/configCliente/EscolhaHorarioCliente';
import FidelidadeCliente from '../componentes/configCliente/FidelidadeCliente';
import Logo from '../componentes/ui/Logo';
import BadgeStatus from '../componentes/ui/BadgeStatus';
import { apiFetch } from '../utils/api';
import { obterSessao, encerrarSessao } from '../utils/sessao';
import { useAtualizacaoAutomatica } from '../hooks/useAtualizacaoAutomatica';
import ModalConfirmacao from '../componentes/ModalConfirmacao';
import ModalPasso from '../componentes/ui/ModalPasso';
import SeletorDataHorario from '../componentes/configCliente/SeletorDataHorario';

const AGENDAMENTO_VAZIO = { veiculos: [], selecoes: {}, resumo: [], levaTras: null, avaliacaoLevaTras: null };

// Etapas que o cliente acompanha enquanto o carro está no lava-rápido
const ETAPAS_PATIO = [
  { chave: 'Aguardando', nome: 'No pátio', icone: ParkingSquare },
  { chave: 'Em Andamento', nome: 'Lavando', icone: Droplets },
  { chave: 'Finalizado', nome: 'Pronto', icone: CheckCircle2 },
];

// Linha do tempo de um carro no lava-rápido. `compacta` é a versão de uma linha,
// usada quando o cliente tem mais de um carro no pátio ao mesmo tempo.
function LinhaDoTempo({ status, compacta = false }) {
  const etapaAtual = ETAPAS_PATIO.findIndex(e => e.chave === status);
  return (
    <ol className={`grid grid-cols-3 gap-2 ${compacta ? '' : 'rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 sm:p-4'}`}>
      {ETAPAS_PATIO.map((etapa, i) => {
        const feita = i < etapaAtual;
        const atual = i === etapaAtual;
        const Icone = etapa.icone;
        return (
          <li key={etapa.chave} className={`flex items-center text-center ${compacta ? 'flex-row justify-center gap-1.5 sm:justify-start' : 'flex-col gap-2'}`}>
            <span className={`relative grid shrink-0 place-items-center rounded-full transition-colors ${compacta ? 'size-7' : 'size-10'} ${
              atual ? 'bg-marca-500 text-white shadow-lg shadow-marca-500/40' : feita ? 'bg-verde-500 text-white' : 'bg-white/10 text-tinta-400'
            }`}>
              {atual && <span className="absolute inset-0 animate-ping rounded-full bg-marca-400/40" />}
              <Icone size={compacta ? 14 : 18} className="relative" />
            </span>
            <span className={`font-semibold ${compacta ? 'text-[11px] sm:text-xs' : 'text-xs'} ${atual ? 'text-white' : feita ? 'text-verde-300' : 'text-tinta-400'}`}>{etapa.nome}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PaginaCliente() {
  const navigate = useNavigate();
  const sessao = obterSessao();

  const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // FLUXO DE AGENDAMENTO: 1 veículos -> 2 serviços -> 3 modalidade -> 4 data e horário
  // passoAgendamento: null (fechado) | 'veiculos' | 'servicos' | 'modalidade' | 'horario'
  const [passoAgendamento, setPassoAgendamento] = useState(null);
  const [dadosAgendamento, setDadosAgendamento] = useState(AGENDAMENTO_VAZIO);
  const [configAgendamento, setConfigAgendamento] = useState(null); // horários, vagas e taxa do leva e traz
  const [cupomSugerido, setCupomSugerido] = useState(''); // vem do botão "usar" da fidelidade/promoção

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Nome para a saudação
  const [nomeCliente, setNomeCliente] = useState('');
  useEffect(() => {
    apiFetch(`${API_URL}/api/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => me?.nome && setNomeCliente(String(me.nome).trim().split(' ')[0]))
      .catch(() => {});
  }, []);

  // Pacote + extras, numa linha
  const descricaoServico = (item) => [item.pacote_nome || 'Serviço avulso', item.servicos_extras].filter(Boolean).join(' + ');

  const buscarDadosClienteBackend = async () => {
    try {
      const sessao = obterSessao();
      if (!sessao) {
        navigate('/login');
        return;
      }

      const resposta = await apiFetch(`${API_URL}/api/execucoes/cliente/${sessao.id}`);

      if (resposta.ok) {
        setUltimosAgendamentos(await resposta.json());
      }
    } catch (erro) {
      console.error("Erro ao buscar dados do painel do cliente:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDadosClienteBackend();
  }, [navigate, API_URL]);

  // Acompanhamento em tempo real: o status do carro muda sozinho na tela (a cada 15 s
  // e ao voltar para a aba). Pausa enquanto o cliente está no meio de um agendamento.
  useAtualizacaoAutomatica(buscarDadosClienteBackend, 15000, passoAgendamento === null);

  // Cancelamento de um carro agendado pelo próprio cliente
  const [cancelando, setCancelando] = useState(null); // item a confirmar
  const [aviso, setAviso] = useState(null); // { titulo, mensagem }

  const confirmarCancelamento = async () => {
    const item = cancelando;
    setCancelando(null);
    try {
      const res = await apiFetch(`${API_URL}/api/agendamentos/servicos/${item.id}/cancelar`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setAviso({ titulo: 'Não foi possível cancelar', mensagem: json.erro || 'Tente de novo em instantes.' });
    } catch {
      setAviso({ titulo: 'Sem conexão', mensagem: 'Não conseguimos falar com o servidor. Tente de novo.' });
    }
    buscarDadosClienteBackend();
  };

  // Remarcação: o cliente escolhe outra data e horário para o mesmo carro (pacote e preço iguais)
  const [remarcando, setRemarcando] = useState(null); // { item, data, horario }
  const [salvandoRemarcacao, setSalvandoRemarcacao] = useState(false);
  const abrirRemarcacao = (item) => {
    const [data, horario] = (item.data_agendamento || '').split(' ');
    setRemarcando({ item, data, horario, original: item.data_agendamento });
  };
  const confirmarRemarcacao = async () => {
    const { item, data, horario } = remarcando;
    setSalvandoRemarcacao(true);
    try {
      const res = await apiFetch(`${API_URL}/api/agendamentos/servicos/${item.id}/remarcar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, horario })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setRemarcando(null);
        const [ano, mes, dia] = data.split('-');
        setAviso({ titulo: 'Agendamento remarcado', mensagem: `O ${item.marca} ${item.modelo} agora está marcado para ${dia}/${mes}/${ano} às ${horario}.` });
        buscarDadosClienteBackend();
      } else {
        setAviso({ titulo: 'Não foi possível remarcar', mensagem: json.erro || 'Tente de novo em instantes.' });
      }
    } catch {
      setAviso({ titulo: 'Sem conexão', mensagem: 'Não conseguimos falar com o servidor. Tente de novo.' });
    } finally {
      setSalvandoRemarcacao(false);
    }
  };

  // Horário já passou (o carro está atrasado): pelo app não dá mais para remarcar nem cancelar
  const horarioPassou = (item) => Boolean(item.data_agendamento) && new Date(item.data_agendamento.replace(' ', 'T')) <= new Date();

  const botaoCancelar = (item, classe = '') => item.status === 'Agendado' && !horarioPassou(item) && (
    <span className={`inline-flex items-center gap-1 ${classe}`}>
      {item.data_agendamento && (
        <button onClick={() => abrirRemarcacao(item)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-marca-700 hover:bg-marca-50">
          <CalendarClock size={13} /> Remarcar
        </button>
      )}
      <button onClick={() => setCancelando(item)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
        <CalendarX size={13} /> Cancelar
      </button>
    </span>
  );

  // O card de status olha só o que está no pátio (agendados e cancelados não contam).
  // Todos os carros em andamento aparecem: os que já estão lavando vêm primeiro.
  const noPatio = ultimosAgendamentos
    .filter(item => item.status === 'Aguardando' || item.status === 'Em Andamento')
    .sort((a, b) => (a.status === b.status ? a.id - b.id : a.status === 'Em Andamento' ? -1 : 1));
  const variosNoPatio = noPatio.length > 1;
  const lavando = noPatio.filter(item => item.status === 'Em Andamento').length;
  // Próximo horário marcado
  const proximoAgendado = ultimosAgendamentos
    .filter(item => item.status === 'Agendado' && item.data_agendamento)
    .sort((a, b) => a.data_agendamento.localeCompare(b.data_agendamento))[0];
  // Leva e traz: motorista indo buscar ou trazendo o carro de volta
  const primeiroNome = (nome) => String(nome || '').split(' ')[0];
  const voltando = ultimosAgendamentos.find(item => item.status === 'Finalizado' && item.tipo_logistica === 'leva_tras' && item.logistica_status === 'entregando');
  const buscando = ultimosAgendamentos.find(item => item.status === 'Agendado' && item.tipo_logistica === 'leva_tras' && item.logistica_status === 'buscando');
  const avisoLevaTras = voltando
    ? `${primeiroNome(voltando.motorista_nome) || 'O motorista'} está trazendo o ${voltando.marca} ${voltando.modelo} de volta`
    : buscando ? `${primeiroNome(buscando.motorista_nome) || 'O motorista'} está a caminho para buscar o ${buscando.marca} ${buscando.modelo}` : null;
  const textoLogistica = (item) => {
    if (item.tipo_logistica !== 'leva_tras') return null;
    if (item.status === 'Agendado' && item.logistica_status === 'a_buscar') return 'Leva e traz: vamos buscar o carro';
    if (item.status === 'Cancelado') return null;
    if (item.status === 'Agendado' && item.logistica_status === 'buscando') return `${primeiroNome(item.motorista_nome) || 'Motorista'} a caminho para buscar`;
    if (item.logistica_status === 'entregando') return 'A caminho de volta';
    if (item.logistica_status === 'entregue' && item.status === 'Finalizado') return 'Entregue';
    if (item.logistica_status === 'coletado' && item.status === 'Finalizado') return 'Pronto, aguardando a entrega';
    return null;
  };
  const totalConcluidos = ultimosAgendamentos.filter(item => !['Agendado', 'Aguardando', 'Em Andamento', 'Cancelado'].includes(item.status)).length;

  const lidarComLogout = () => {
    encerrarSessao();
    navigate('/login');
  };

  // Agendado: data e hora marcadas ('AAAA-MM-DD HH:MM'); senão, a data de entrada
  const formatarDataTabela = (item) => {
    if (item.data_agendamento) {
      const [dia, hora] = item.data_agendamento.split(' ');
      const [ano, mes, d] = dia.split('-');
      return `${d}/${mes}/${ano} às ${hora}`;
    }
    return new Date(item.criado_em).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // FLUXO DE AGENDAMENTO
  const iniciarAgendamento = async (codigoCupom = '') => {
      setCupomSugerido(typeof codigoCupom === 'string' ? codigoCupom : '');
      setDadosAgendamento(AGENDAMENTO_VAZIO);
      setPassoAgendamento('veiculos');
      try {
          const resposta = await apiFetch(`${API_URL}/api/agendamentos/config`);
          if (resposta.ok) setConfigAgendamento(await resposta.json());
      } catch (erro) {
          console.error('Erro ao carregar opções de agendamento:', erro);
      }
  };

  const cancelarAgendamento = () => {
      setPassoAgendamento(null);
      setDadosAgendamento(AGENDAMENTO_VAZIO);
  };

  // Passo 1 -> 2: guarda os carros e descarta escolhas de carros que saíram da seleção
  const avancarParaServicos = (veiculos) => {
      setDadosAgendamento(prev => {
          const selecoes = {};
          veiculos.forEach(v => { if (prev.selecoes[v.id]) selecoes[v.id] = prev.selecoes[v.id]; });
          return { ...prev, veiculos, selecoes };
      });
      setPassoAgendamento('servicos');
  };

  // Passo 2 -> 3
  const avancarParaModalidade = (selecoes, resumo) => {
      setDadosAgendamento(prev => ({ ...prev, selecoes, resumo }));
      setPassoAgendamento('modalidade');
  };

  // Passo 3 -> 4
  // avaliacaoLevaTras: distância, endereço de busca e valor por veículo (só no leva e traz)
  const avancarParaHorario = (tipoLogistica, avaliacaoLevaTras) => {
      setDadosAgendamento(prev => ({ ...prev, levaTras: tipoLogistica, avaliacaoLevaTras }));
      setPassoAgendamento('horario');
  };

  const concluirAgendamentoComSucesso = () => {
      cancelarAgendamento();
      window.location.reload(); // Recarrega a página para atualizar a lista de agendamentos
  };

  // Título do destaque conforme quantos carros estão no lava-rápido
  let tituloPatio = null;
  if (noPatio.length === 1) {
    tituloPatio = noPatio[0].status === 'Em Andamento' ? 'Seu carro está sendo lavado' : 'Seu carro já está no pátio';
  } else if (variosNoPatio) {
    tituloPatio = `Seus ${noPatio.length} carros estão com a gente`;
  }
  const inicial = (sessao?.email || 'C').charAt(0).toUpperCase();

  return (
    <div className="fw-app min-h-[100dvh]">

      {/* Barra superior */}
      <header className="sticky top-0 z-50 border-b border-tinta-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo tamanho="sm" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[220px] truncate text-sm font-semibold text-tinta-900">{sessao?.email || 'Cliente'}</p>
              <p className="text-xs text-tinta-500">Área do cliente</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-marca-500 to-verde-500 text-sm font-bold text-white ring-2 ring-white">
              {inicial}
            </span>
            <button onClick={lidarComLogout} className="fw-btn-fantasma h-9" aria-label="Sair">
              <LogOut size={18} /><span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-6 sm:pt-8">

        {/* Destaque: status do carro + agendar */}
        <section className="relative overflow-hidden rounded-3xl bg-tinta-950 p-5 text-white shadow-elevada sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-marca-600/45 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-verde-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ouro-300">
                <Sparkles size={15} /> {nomeCliente ? `Olá, ${nomeCliente}!` : 'Olá, que bom te ver por aqui'}
              </p>

              {avisoLevaTras && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-ouro-400/15 px-3 py-1.5 text-sm font-semibold text-ouro-200 ring-1 ring-ouro-300/30">
                  <Truck size={16} /> {avisoLevaTras}
                </p>
              )}

              {noPatio.length > 0 ? (
                <>
                  <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{tituloPatio}</h1>
                  {variosNoPatio ? (
                    <p className="mt-1.5 text-sm text-tinta-300">
                      {lavando === 0
                        ? 'Todos já estão no pátio, aguardando a lavagem.'
                        : `${lavando} ${lavando === 1 ? 'sendo lavado' : 'sendo lavados'} agora · ${noPatio.length - lavando} no pátio`}
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-tinta-300">
                      <Car size={16} /> {noPatio[0].marca} {noPatio[0].modelo} · {descricaoServico(noPatio[0])}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Pronto para deixar o carro brilhando?</h1>
                  <p className="mt-1.5 max-w-md text-sm text-tinta-300">
                    Nenhum carro no pátio agora. Agende em poucos toques e acompanhe tudo por aqui.
                  </p>
                </>
              )}
            </div>

            <button onClick={() => iniciarAgendamento()} className="fw-btn-ouro h-12 w-full shrink-0 px-6 text-[15px] md:w-auto">
              <CalendarPlus size={18} /> Agendar lavagem
            </button>
          </div>

          {/* Linha do tempo enquanto o carro está no lava-rápido (uma por carro) */}
          {noPatio.length === 1 && (
            <div className="relative mt-6"><LinhaDoTempo status={noPatio[0].status} /></div>
          )}
          {variosNoPatio && (
            <ul className="relative mt-6 divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
              {noPatio.map(item => (
                <li key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white"><Car size={17} /></span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{item.marca} {item.modelo}</p>
                      <p className="truncate text-xs text-tinta-300">
                        {item.placa && <span className="font-mono uppercase">{item.placa} · </span>}
                        {item.pacote_nome || 'Serviço avulso'}
                      </p>
                    </div>
                  </div>
                  <div className="sm:w-80 sm:shrink-0"><LinhaDoTempo status={item.status} compacta /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Promoção relâmpago e programa de fidelidade */}
        <FidelidadeCliente aoUsarCupom={iniciarAgendamento} />

        {/* Resumo rápido */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="fw-card col-span-2 flex items-center gap-4 p-4 sm:col-span-1 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca-50 text-marca-600">
              <CalendarClock size={22} />
            </span>
            <div className="min-w-0">
              <p className="fw-rotulo-secao">Próximo agendamento</p>
              {proximoAgendado ? (
                <>
                  <p className="mt-0.5 truncate font-semibold text-tinta-900">{formatarDataTabela(proximoAgendado)}</p>
                  <p className="truncate text-sm text-tinta-500">{proximoAgendado.marca} {proximoAgendado.modelo} · {descricaoServico(proximoAgendado)}{proximoAgendado.tipo_logistica === 'leva_tras' ? ' · Leva e traz' : ''}</p>
                </>
              ) : (
                <p className="mt-0.5 text-sm text-tinta-500">Nenhum horário marcado</p>
              )}
            </div>
          </div>
          <div className="fw-card col-span-2 flex items-center gap-4 p-4 sm:col-span-1 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-verde-50 text-verde-600">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <p className="fw-rotulo-secao">Lavagens concluídas</p>
              <p className="mt-0.5 font-display text-2xl font-extrabold text-tinta-950">{totalConcluidos}</p>
            </div>
          </div>
        </section>

        {/* Histórico */}
        <section className="fw-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-tinta-100 px-4 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-tinta-950 sm:text-lg">
              <History size={18} className="text-marca-600" /> Seus agendamentos
            </h2>
            {!carregando && ultimosAgendamentos.length > 0 && (
              <span className="text-xs font-medium text-tinta-500">{ultimosAgendamentos.length} no total</span>
            )}
          </div>

          {carregando ? (
            <div className="space-y-3 p-4 sm:p-6">
              {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-tinta-100" />)}
            </div>
          ) : ultimosAgendamentos.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-marca-50 text-marca-600"><Droplets size={26} /></span>
              <p className="mt-4 font-semibold text-tinta-900">Nenhum serviço por aqui ainda</p>
              <p className="mt-1 max-w-xs text-sm text-tinta-500">Quando você agendar uma lavagem, ela aparece nesta lista.</p>
              <button onClick={iniciarAgendamento} className="fw-btn-primario mt-5"><CalendarPlus size={17} /> Agendar agora</button>
            </div>
          ) : (
            <>
              {/* Celular: lista de cartões */}
              <ul className="divide-y divide-tinta-100 md:hidden">
                {ultimosAgendamentos.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tinta-100 text-tinta-600"><Car size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-tinta-900">{item.marca} {item.modelo}</p>
                        <BadgeStatus status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-tinta-500">{descricaoServico(item)}</p>
                      {textoLogistica(item) && <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ouro-700"><Truck size={12} /> {textoLogistica(item)}</p>}
                      <div className="mt-1 flex items-center justify-between text-xs text-tinta-500">
                        <span>{formatarDataTabela(item)}</span>
                        <span className="font-semibold text-tinta-800">{formatarValor(item.valor_total)}</span>
                      </div>
                      {botaoCancelar(item, '-ml-2 mt-1')}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Computador: tabela */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-tinta-50 text-xs uppercase tracking-wider text-tinta-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Veículo</th>
                      <th className="px-6 py-3 font-semibold">Serviço</th>
                      <th className="px-6 py-3 font-semibold">Data</th>
                      <th className="px-6 py-3 text-right font-semibold">Valor</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tinta-100">
                    {ultimosAgendamentos.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-tinta-50/70">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-lg bg-tinta-100 text-tinta-600"><Car size={16} /></span>
                            <span className="font-semibold text-tinta-900">{item.marca} {item.modelo}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-tinta-600">{descricaoServico(item)}</td>
                        <td className="px-6 py-4 text-tinta-600">{formatarDataTabela(item)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-tinta-900">{formatarValor(item.valor_total)}</td>
                        <td className="px-6 py-4">
                          <BadgeStatus status={item.status} />
                          {textoLogistica(item) && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ouro-700"><Truck size={12} /> {textoLogistica(item)}</p>}
                        </td>
                        <td className="px-6 py-4 text-right">{botaoCancelar(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

      </main>

      {/* ========================================== */}
      {/* AGENDAMENTO: 1 VEÍCULOS -> 2 SERVIÇOS -> 3 MODALIDADE -> 4 HORÁRIO */}
      {/* ========================================== */}
      {passoAgendamento === 'veiculos' && (
          <EscolhaVeiculoCliente
              veiculosIniciais={dadosAgendamento.veiculos}
              aoAvancar={avancarParaServicos}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {passoAgendamento === 'servicos' && (
          <EscolhaServicoCliente
              veiculos={dadosAgendamento.veiculos}
              selecoesIniciais={dadosAgendamento.selecoes}
              aoAvancar={avancarParaModalidade}
              aoVoltar={() => setPassoAgendamento('veiculos')}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {passoAgendamento === 'modalidade' && (
          <EscolhaLevaTrasCliente
              resumo={dadosAgendamento.resumo}
              levaTras={configAgendamento?.leva_tras}
              tipoInicial={dadosAgendamento.levaTras}
              aoAvancar={avancarParaHorario}
              aoVoltar={() => setPassoAgendamento('servicos')}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {passoAgendamento === 'horario' && (
          <EscolhaHorarioCliente
              resumo={dadosAgendamento.resumo}
              tipoLogistica={dadosAgendamento.levaTras}
              levaTras={dadosAgendamento.avaliacaoLevaTras}
              enderecoLavaRapido={configAgendamento?.endereco_lava_rapido}
              cupomInicial={cupomSugerido}
              aoConcluir={concluirAgendamentoComSucesso}
              aoVoltar={() => setPassoAgendamento('modalidade')}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {remarcando && (
        <ModalPasso
          titulo="Remarcar lavagem"
          subtitulo={`${remarcando.item.marca} ${remarcando.item.modelo} · hoje marcado para ${formatarDataTabela(remarcando.item)}. O serviço e o valor continuam iguais.`}
          aoFechar={() => setRemarcando(null)}
          rodape={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="fw-btn-contorno" onClick={() => setRemarcando(null)}>Voltar</button>
              <button
                type="button"
                className="fw-btn-primario"
                disabled={salvandoRemarcacao || !remarcando.horario || `${remarcando.data} ${remarcando.horario}` === remarcando.original}
                onClick={confirmarRemarcacao}
              >
                {salvandoRemarcacao ? 'Salvando...' : 'Confirmar novo horário'}
              </button>
            </div>
          }
        >
          <SeletorDataHorario
            data={remarcando.data}
            horario={remarcando.horario}
            onChange={({ data, horario }) => setRemarcando((r) => ({ ...r, data, horario }))}
          />
        </ModalPasso>
      )}

      <ModalConfirmacao
        isOpen={!!cancelando}
        titulo="Cancelar agendamento"
        mensagem={cancelando ? `Cancelar a lavagem do ${cancelando.marca} ${cancelando.modelo} em ${formatarDataTabela(cancelando)}?` : ''}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelando(null)}
        tipo="perigo"
        textoConfirmar="Cancelar lavagem"
        textoCancelar="Manter"
      />
      <ModalConfirmacao
        isOpen={!!aviso}
        titulo={aviso?.titulo}
        mensagem={aviso?.mensagem}
        onConfirm={() => setAviso(null)}
        onCancel={() => setAviso(null)}
        soAviso
      />
    </div>
  );
}
