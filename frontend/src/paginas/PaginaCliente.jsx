import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';
import EscolhaServicoCliente from '../componentes/configCliente/EscolhaServicoCliente';
import EscolhaVeiculoCliente from '../componentes/configCliente/EscolhaVeiculoCliente';
import EscolhaLevaTrasCliente from '../componentes/configCliente/EscolhaLevaTrasCliente';
import EscolhaHorarioCliente from '../componentes/configCliente/EscolhaHorarioCliente';
import { apiFetch } from '../utils/api';
import { obterSessao, encerrarSessao } from '../utils/sessao';

const AGENDAMENTO_VAZIO = { veiculos: [], selecoes: {}, resumo: [], levaTras: null };

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  const [statusVeiculo, setStatusVeiculo] = useState('concluido');
  const [etapaAvaliacaoAberta, setEtapaAvaliacaoAberta] = useState(false);
  const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // FLUXO DE AGENDAMENTO: 1 veículos -> 2 serviços -> 3 modalidade -> 4 data e horário
  // passoAgendamento: null (fechado) | 'veiculos' | 'servicos' | 'modalidade' | 'horario'
  const [passoAgendamento, setPassoAgendamento] = useState(null);
  const [dadosAgendamento, setDadosAgendamento] = useState(AGENDAMENTO_VAZIO);
  const [configAgendamento, setConfigAgendamento] = useState(null); // horários, vagas e taxa do leva e traz

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    async function buscarDadosClienteBackend() {
      try {
        const sessao = obterSessao();
        if (!sessao) {
          navigate('/login');
          return;
        }

        const resposta = await apiFetch(`${API_URL}/api/execucoes/cliente/${sessao.id}`);

        if (resposta.ok) {
          const dados = await resposta.json();
          setUltimosAgendamentos(dados);

          // O card de status olha só o que está no pátio (agendados e cancelados não contam)
          const noPatio = dados.find(item => item.status === 'Aguardando' || item.status === 'Em Andamento');
          if (noPatio?.status === 'Aguardando') {
            setStatusVeiculo('no_patio');
          } else if (noPatio?.status === 'Em Andamento') {
            setStatusVeiculo('em_andamento');
          } else {
            setStatusVeiculo('concluido');
          }
        }
      } catch (erro) {
        console.error("Erro ao buscar dados do painel do cliente:", erro);
      } finally {
        setCarregando(false);
      }
    }

    buscarDadosClienteBackend();
  }, [navigate, API_URL]);

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

  const renderStatusBadge = (status) => {
    if (status === 'Aguardando') {
      return <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Aguardando</span>;
    } else if (status === 'Em Andamento') {
      return <span style={{ background: '#bfdbfe', color: '#1e3a8a', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Em Andamento</span>;
    } else if (status === 'Agendado') {
      return <span style={{ background: '#e9d5ff', color: '#581c87', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Agendado</span>;
    } else if (status === 'Cancelado') {
      return <span style={{ background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Cancelado</span>;
    } else {
      return <span style={{ background: '#bbf7d0', color: '#166534', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Concluído</span>;
    }
  };

  // FLUXO DE AGENDAMENTO
  const iniciarAgendamento = async () => {
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
  const avancarParaHorario = (tipoLogistica) => {
      setDadosAgendamento(prev => ({ ...prev, levaTras: tipoLogistica }));
      setPassoAgendamento('horario');
  };

  const concluirAgendamentoComSucesso = () => {
      cancelarAgendamento();
      window.location.reload(); // Recarrega a página para atualizar a tabela de histórico
  };

  return (
    <div className="home-cliente-pagina-completa">
      
      {/* Navbar Superior */}
      <header className="navbar-superior">
        <div className="navbar-conteudo">
          <h2 className="navbar-logo">FLEX WASH</h2>
          
          <div className="navbar-usuario-area">
            <div className="navbar-info-texto">
              <span className="navbar-nome-usuario">Cliente FlexWash</span>
              <span className="navbar-perfil-usuario">ÁREA DO CLIENTE</span>
            </div>
            <div className="navbar-avatar">CF</div>
            <button onClick={lidarComLogout} className="btn-sair-navbar">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Dashboard de fundo) */}
      <main className="home-cliente-container">
        <div className="home-cliente-banner">
        <h1>Bem-vindo ao Flex Wash</h1>
        <p>Gestão inteligente e estética automotiva de alto padrão para o seu veículo.</p>
        </div>

        <div className="home-cliente-grid">
            <div className="home-cliente-card">
                <h3>Status Atual do Veículo</h3>
                <div className="home-cliente-status-box">
                <p><strong>Situação atual:</strong> 
                    <span className="badge-status">
                    {statusVeiculo === 'no_patio' && 'Veículo no pátio (Aguardando)'}
                    {statusVeiculo === 'em_andamento' && 'Serviço em andamento'}
                    {statusVeiculo === 'concluido' && 'Nenhum serviço em andamento'}
                    </span>
                </p>
                </div>
            </div>

            <div className="home-cliente-card flex-between">
                <div>
                <h3>Novo Agendamento</h3>
                <p className="texto-descricao-card">Precisa deixar seu carro brilhando de novo? Agende um horário com nossa equipe em poucos cliques.</p>
                </div>
                <button onClick={iniciarAgendamento} className="btn-primario">
                Agendar Nova Lavagem
                </button>
            </div>
        </div>

        {/* Tabela de Histórico */}
        <div className="home-cliente-card secao-tabela">
          <h3>Últimos Agendamentos</h3>
          {carregando ? (
              <p className="texto-carregando">A carregar o seu histórico...</p>
          ) : (
              <div className="table-responsive">
              <table className="tabela-historico">
                  <thead>
                  <tr>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Veículo</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Serviço</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Data</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Valor Total</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  </tr>
                  </thead>
                  <tbody>
                  {ultimosAgendamentos.length === 0 ? (
                      <tr>
                      <td colSpan="5" className="tabela-vazia" style={{ textAlign: 'center', padding: '2rem' }}>
                          Nenhum serviço registrado até ao momento.
                      </td>
                      </tr>
                  ) : (
                      ultimosAgendamentos.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '12px' }}><strong>{item.marca} {item.modelo}</strong></td>
                          <td style={{ padding: '12px' }}>{item.pacote_nome || 'Serviço Avulso'}</td>
                          <td style={{ padding: '12px' }}>{formatarDataTabela(item)}</td>
                          <td style={{ padding: '12px' }}>R$ {Number(item.valor_total).toFixed(2)}</td>
                          <td style={{ padding: '12px' }}>{renderStatusBadge(item.status)}</td>
                      </tr>
                      ))
                  )}
                  </tbody>
              </table>
              </div>
          )}
        </div>
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
              levaTras={configAgendamento?.leva_tras}
              aoConcluir={concluirAgendamentoComSucesso}
              aoVoltar={() => setPassoAgendamento('modalidade')}
              aoCancelar={cancelarAgendamento}
          />
      )}

    </div>
  );
}