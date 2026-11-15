import React, { useState, useEffect } from 'react';
import { Trash2, FileSpreadsheet, FileText, History as HistoryIcon, RotateCcw, Pencil, Search } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import BadgeStatus from '../componentes/ui/BadgeStatus';
import { apiFetch } from '../utils/api';
import ModalEquipe from '../componentes/ModalEquipe';
import { obterPerfil } from '../utils/sessao';

// Hoje e o dia 1 do mês, no fuso do navegador
function periodoDoMes() {
  const hoje = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fim = `${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}`;
  return { inicio: `${fim.slice(0, 7)}-01`, fim };
}

const tempoLavagem = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`);
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function Historico({ abrirAlerta }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState(() => ({ ...periodoDoMes(), funcionario_id: '', busca: '' }));
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [editandoEquipe, setEditandoEquipe] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const perfilUsuario = obterPerfil() || 'funcionario'; // lido do token
  const ehAdmin = perfilUsuario === 'administrador';

  const buscarHistorico = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams({ inicio: filtros.inicio, fim: filtros.fim });
      if (filtros.funcionario_id) params.set('funcionario_id', filtros.funcionario_id);
      if (filtros.busca) params.set('busca', filtros.busca);
      const resposta = await apiFetch(`${API_URL}/api/execucoes/historico?${params}`);
      
      if (resposta.ok) {
        const dados = await resposta.json();
        setHistorico(dados);
      } else {
        const json = await resposta.json().catch(() => ({}));
        if (abrirAlerta) abrirAlerta('Atenção', json.erro || 'Não foi possível carregar o histórico.', () => {}, 'perigo');
      }
    } catch (erro) {
      console.error("Erro ao buscar histórico:", erro);
      if (abrirAlerta) abrirAlerta('Erro', 'Não foi possível carregar o histórico.', () => {}, 'perigo');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarHistorico();
  }, [filtros]);

  // Lista da equipe para o filtro "Quem lavou"
  useEffect(() => {
    apiFetch(`${API_URL}/api/funcionarios`)
      .then((r) => r.json())
      .then((json) => setFuncionarios(Array.isArray(json) ? json : (json.dados || [])))
      .catch(() => {});
  }, []);

  // A busca por nome/placa só dispara 400 ms depois que a pessoa para de digitar
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.busca === buscaDigitada.trim() ? f : { ...f, busca: buscaDigitada.trim() })), 400);
    return () => clearTimeout(t);
  }, [buscaDigitada]);

  // Administrador: devolve um serviço finalizado por engano para "Lavando" no pátio
  const reabrir = (item) => {
    abrirAlerta(
      'Reabrir serviço',
      `Voltar o ${item.marca} ${item.modelo} (${item.placa}) para "Lavando" no pátio? Ele sai do histórico até ser concluído de novo.`,
      async () => {
        const res = await apiFetch(`${API_URL}/api/execucoes/${item.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novoStatus: 'Em Andamento' })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          abrirAlerta('Não foi possível reabrir', json.erro || 'Erro ao reabrir o serviço.', () => {}, 'perigo');
        }
        buscarHistorico();
      }
    );
  };

  const salvarEquipe = async (ids) => {
    const item = editandoEquipe;
    setEditandoEquipe(null);
    const res = await apiFetch(`${API_URL}/api/execucoes/${item.id}/equipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcionarios: ids })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      abrirAlerta('Não foi possível salvar', json.erro || 'Erro ao salvar a equipe.', () => {}, 'perigo');
    }
    buscarHistorico();
  };

  const handleExcluirRegistro = (id) => {
    if (abrirAlerta) {
      abrirAlerta(
        'Apagar Registro',
        `Tem certeza que deseja apagar este histórico (#${id})? Esta ação não pode ser desfeita.`,
        async () => {
          try {
            const resposta = await apiFetch(`${API_URL}/api/execucoes/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
              setHistorico(prev => prev.filter(item => item.id !== id));
            } else {
              const json = await resposta.json().catch(() => ({}));
              abrirAlerta('Não foi possível apagar', json.erro || json.mensagem || 'Erro ao apagar o registro.', () => {}, 'perigo');
            }
          } catch {
            abrirAlerta('Erro', 'Falha na conexão com o servidor.', () => {}, 'perigo');
          }
        },
        'perigo'
      );
    } else {
      if (window.confirm('Tem certeza que deseja apagar este registro?')) {
        // Fallback caso o abrirAlerta não seja passado
      }
    }
  };

  // Exporta a lista filtrada em CSV (abre no Excel). Separador ";" e BOM para os acentos.
  const handleExportarExcel = () => {
    const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['Número', 'Dia', 'Veículo', 'Placa', 'Porte', 'Cliente', 'Serviço', 'Responsáveis', 'Lavagem (min)', ...(ehAdmin ? ['Valor (R$)'] : [])],
      ...historico.map((i) => [
        i.id, dataBR(i.dia), `${i.marca} ${i.modelo}`, i.placa, i.porte, i.cliente_nome,
        [i.pacote_nome || 'Serviço avulso', i.servicos_extras].filter(Boolean).join(' + '),
        i.responsaveis || '', i.minutos_lavagem ?? '', ...(ehAdmin ? [Number(i.valor_total || 0).toFixed(2).replace('.', ',')] : [])
      ])
    ];
    const csv = '\ufeff' + linhas.map((l) => l.map(celula).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_${filtros.inicio}_a_${filtros.fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // PDF: usa a impressão do navegador ("Salvar como PDF")
  const handleExportarPDF = () => window.print();

  const totalFaturado = historico.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina titulo="Histórico" subtitulo={ehAdmin ? 'Todas as lavagens finalizadas, com valores e responsáveis.' : 'Todas as lavagens finalizadas e quem lavou cada carro.'}>
        <button onClick={handleExportarExcel} className="fw-btn-contorno"><FileSpreadsheet size={17} className="text-verde-600" /> Excel / CSV</button>
        <button onClick={handleExportarPDF} className="fw-btn-contorno"><FileText size={17} className="text-red-500" /> PDF</button>
      </CabecalhoPagina>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-tinta-500">
          De
          <input type="date" className="fw-input mt-1 h-10" value={filtros.inicio} max={filtros.fim}
            onChange={(e) => e.target.value && setFiltros((f) => ({ ...f, inicio: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-tinta-500">
          Até
          <input type="date" className="fw-input mt-1 h-10" value={filtros.fim} min={filtros.inicio}
            onChange={(e) => e.target.value && setFiltros((f) => ({ ...f, fim: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-tinta-500">
          Quem lavou
          <select className="fw-input mt-1 h-10" value={filtros.funcionario_id}
            onChange={(e) => setFiltros((f) => ({ ...f, funcionario_id: e.target.value }))}>
            <option value="">Toda a equipe</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
        <label className="min-w-48 flex-1 text-xs font-semibold text-tinta-500 sm:max-w-xs">
          Cliente ou placa
          <span className="relative mt-1 block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-400" />
            <input className="fw-input h-10 pl-9" placeholder="Ex.: Maria ou ABC1D23" value={buscaDigitada}
              onChange={(e) => setBuscaDigitada(e.target.value)} />
          </span>
        </label>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-xl">
        <div className="fw-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-tinta-500">Atendimentos</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-tinta-950 sm:text-3xl">{historico.length}</p>
        </div>
        {ehAdmin && (
          <div className="fw-card p-4 sm:p-5">
            <p className="text-sm font-semibold text-tinta-500">Total faturado</p>
            <p className="mt-1 truncate font-display text-2xl font-extrabold text-verde-700 sm:text-3xl">{moeda(totalFaturado)}</p>
          </div>
        )}
      </div>

      <Secao titulo="Atendimentos finalizados" icone={HistoryIcon} semPadding>
        {carregando ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-tinta-100" />)}</div>
        ) : historico.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-tinta-500">Nenhum serviço finalizado com esses filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="fw-tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Veículo</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Responsáveis</th>
                  {ehAdmin && <th className="text-right">Valor</th>}
                  <th>Status</th>
                  {ehAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {historico.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-tinta-400">#{item.id}</td>
                    <td className="whitespace-nowrap">
                      {dataBR(item.dia)}
                      {item.minutos_lavagem !== null && item.minutos_lavagem !== undefined && (
                        <p className="text-[11px] text-tinta-400" title="Do início ao fim da lavagem">{tempoLavagem(item.minutos_lavagem)} lavando</p>
                      )}
                    </td>
                    <td>
                      <p className="whitespace-nowrap font-semibold text-tinta-900">{item.marca} {item.modelo}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-tinta-500"><span className="fw-placa">{item.placa}</span> {item.porte}</div>
                    </td>
                    <td className="whitespace-nowrap">{item.cliente_nome}</td>
                    <td>
                      <p className="font-medium text-tinta-800">{item.pacote_nome || 'Serviço avulso'}</p>
                      {item.servicos_extras && <p className="text-xs text-verde-700">+ {item.servicos_extras}</p>}
                    </td>
                    <td className="text-xs text-tinta-500">
                      <span className="flex items-center gap-1">
                        {item.responsaveis || <span className="font-semibold text-ouro-700">Não atribuído</span>}
                        {ehAdmin && (
                          <button onClick={() => setEditandoEquipe(item)} className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Corrigir equipe" aria-label="Corrigir equipe">
                            <Pencil size={13} />
                          </button>
                        )}
                      </span>
                    </td>
                    {ehAdmin && <td className="whitespace-nowrap text-right font-semibold text-tinta-900">{moeda(item.valor_total)}</td>}
                    <td><BadgeStatus status="Finalizado" /></td>
                    {ehAdmin && (
                      <td className="whitespace-nowrap text-right">
                        <button className="mr-1 inline-grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" onClick={() => reabrir(item)} title="Reabrir (finalizado por engano)" aria-label="Reabrir serviço">
                          <RotateCcw size={16} />
                        </button>
                        <button className="fw-btn-perigo" onClick={() => handleExcluirRegistro(item.id)} title="Apagar do histórico" aria-label="Apagar do histórico">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {editandoEquipe && (
        <ModalEquipe
          titulo="Corrigir equipe"
          descricao={`${editandoEquipe.marca} ${editandoEquipe.modelo} · ${editandoEquipe.placa} · ${dataBR(editandoEquipe.dia)}`}
          selecionadosIniciais={String(editandoEquipe.responsaveis_ids || '').split(',').filter(Boolean).map(Number)}
          textoConfirmar="Salvar equipe"
          aoFechar={() => setEditandoEquipe(null)}
          aoConfirmar={salvarEquipe}
        />
      )}
    </div>
  );
}
