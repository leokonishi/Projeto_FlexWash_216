import React, { useState, useEffect } from 'react';
import { Trash2, FileSpreadsheet, FileText, History as HistoryIcon } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import BadgeStatus from '../componentes/ui/BadgeStatus';
import { apiFetch, API_URL } from '../utils/api';
import { obterPerfil } from '../utils/sessao';

export default function Historico({ abrirAlerta }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const perfilUsuario = obterPerfil() || 'funcionario'; // lido do token

  const buscarHistorico = async () => {
    try {
      setCarregando(true);
      const resposta = await apiFetch(`${API_URL}/api/execucoes/historico`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });
      
      if (resposta.ok) {
        const dados = await resposta.json();
        setHistorico(dados);
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
  }, []);

  const handleExcluirRegistro = (id) => {
    if (abrirAlerta) {
      abrirAlerta(
        'Apagar Registro',
        `Tem certeza que deseja apagar este histórico (#${id})? Esta ação não pode ser desfeita.`,
        async () => {
          try {
            const resposta = await apiFetch(`${API_URL}/api/execucoes/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
              setHistorico(historico.filter(item => item.id !== id));
            }
          } catch (erro) {
            console.error(erro);
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

  // Funções placeholder para os botões de exportação (podem ser implementadas depois)
  const handleExportarExcel = () => alert('A exportação para Excel será implementada em breve!');
  const handleExportarPDF = () => alert('A exportação para PDF será implementada em breve!');

  const totalFaturado = historico.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina titulo="Histórico" subtitulo="Todas as lavagens finalizadas, com valores e responsáveis.">
        <button onClick={handleExportarExcel} className="fw-btn-contorno"><FileSpreadsheet size={17} className="text-verde-600" /> Excel / CSV</button>
        <button onClick={handleExportarPDF} className="fw-btn-contorno"><FileText size={17} className="text-red-500" /> PDF</button>
      </CabecalhoPagina>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-xl">
        <div className="fw-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-tinta-500">Atendimentos</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-tinta-950 sm:text-3xl">{historico.length}</p>
        </div>
        <div className="fw-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-tinta-500">Total faturado</p>
          <p className="mt-1 truncate font-display text-2xl font-extrabold text-verde-700 sm:text-3xl">{moeda(totalFaturado)}</p>
        </div>
      </div>

      <Secao titulo="Atendimentos finalizados" icone={HistoryIcon} semPadding>
        {carregando ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-tinta-100" />)}</div>
        ) : historico.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-tinta-500">Nenhum serviço finalizado até o momento.</p>
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
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                  {perfilUsuario === 'administrador' && <th />}
                </tr>
              </thead>
              <tbody>
                {historico.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-tinta-400">#{item.id}</td>
                    <td className="whitespace-nowrap">{new Date(item.data_entrada).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <p className="whitespace-nowrap font-semibold text-tinta-900">{item.marca} {item.modelo}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-tinta-500"><span className="fw-placa">{item.placa}</span> {item.porte}</div>
                    </td>
                    <td className="whitespace-nowrap">{item.cliente_nome}</td>
                    <td>
                      <p className="font-medium text-tinta-800">{item.pacote_nome || 'Serviço avulso'}</p>
                      {item.servicos_extras && <p className="text-xs text-verde-700">+ {item.servicos_extras}</p>}
                    </td>
                    <td className="text-xs text-tinta-500">{item.responsaveis || 'Não atribuído'}</td>
                    <td className="whitespace-nowrap text-right font-semibold text-tinta-900">{moeda(item.valor_total)}</td>
                    <td><BadgeStatus status="Finalizado" /></td>
                    {perfilUsuario === 'administrador' && (
                      <td className="text-right">
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
    </div>
  );
}
