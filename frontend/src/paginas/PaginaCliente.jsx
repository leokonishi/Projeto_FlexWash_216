import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';
import EscolhaServicoCliente from '../componentes/configCliente/EscolhaServicoCliente';
import EscolhaVeiculoCliente from '../componentes/configCliente/EscolhaVeiculoCliente';
import EscolhaLevaTrasCliente from '../componentes/configCliente/EscolhaLevaTrasCliente';
import EscolhaHorarioCliente from '../componentes/configCliente/EscolhaHorarioCliente';

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  const [statusVeiculo, setStatusVeiculo] = useState('concluido');
  const [etapaAvaliacaoAberta, setEtapaAvaliacaoAberta] = useState(false);
  const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // CONTROLE DOS MODAIS DO FLUXO DE AGENDAMENTO
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false);
  const [modalLevaTrasAberto, setModalLevaTrasAberto] = useState(false); // Passo 3
  const [modalDataHoraAberto, setModalDataHoraAberto] = useState(false); // Passo 4
  
  const [dadosAgendamento, setDadosAgendamento] = useState({
      servico: null,
      veiculo: null,
      levaTras: null, // Guardará 'cliente_leva' ou 'leva_tras'
      dataHora: null
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    async function buscarDadosClienteBackend() {
      try {
        const token = localStorage.getItem('token_flexwash');
        if (!token) {
          navigate('/login');
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const clienteId = payload.id;

        const resposta = await fetch(`${API_URL}/api/execucoes/cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resposta.ok) {
          const dados = await resposta.json();
          setUltimosAgendamentos(dados);

          if (dados.length > 0) {
            const statusMaisRecente = dados[0].status;
            if (statusMaisRecente === 'Aguardando') {
              setStatusVeiculo('no_patio');
            } else if (statusMaisRecente === 'Em Andamento') {
              setStatusVeiculo('em_andamento');
            } else {
              setStatusVeiculo('concluido');
            }
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
    localStorage.removeItem('token_flexwash');
    navigate('/login');
  };

  const renderStatusBadge = (status) => {
    if (status === 'Aguardando') {
      return <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Aguardando</span>;
    } else if (status === 'Em Andamento') {
      return <span style={{ background: '#bfdbfe', color: '#1e3a8a', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Em Andamento</span>;
    } else {
      return <span style={{ background: '#bbf7d0', color: '#166534', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Concluído</span>;
    }
  };

  // FLUXO DE AGENDAMENTO
  const iniciarAgendamento = () => {
      setModalServicoAberto(true);
  };

  const cancelarAgendamento = () => {
      setModalServicoAberto(false);
      setModalVeiculoAberto(false);
      setModalLevaTrasAberto(false);
      setModalDataHoraAberto(false);
      setDadosAgendamento({ servico: null, veiculo: null, levaTras: null, dataHora: null });
  };

  const avancarParaVeiculo = (servicoEscolhido) => {
      setDadosAgendamento(prev => ({ ...prev, servico: servicoEscolhido }));
      setModalServicoAberto(false);
      setModalVeiculoAberto(true); // Abre o Passo 2
  };

  const voltarParaServico = () => {
      setModalVeiculoAberto(false);
      setModalServicoAberto(true); // Retorna ao Passo 1
  };

  const avancarParaLevaTras = (veiculoEscolhido) => {
      setDadosAgendamento(prev => ({ ...prev, veiculo: veiculoEscolhido }));
      setModalVeiculoAberto(false);
      setModalLevaTrasAberto(true); // Abre o Passo 3 (Leva e Trás)
  };

  const voltarParaVeiculo = () => {
      setModalLevaTrasAberto(false);
      setModalVeiculoAberto(true); // Retorna ao Passo 2
  };

  const avancarParaDataHora = (tipoLogistica) => {
      setDadosAgendamento(prev => ({ ...prev, levaTras: tipoLogistica }));
      setModalLevaTrasAberto(false);
      setModalDataHoraAberto(true); // Abre o Passo 4 (Horário)
  };

  const voltarParaLevaTras = () => {
      setModalDataHoraAberto(false);
      setModalLevaTrasAberto(true); // Retorna ao Passo 3
  };

  const concluirAgendamentoComSucesso = () => {
      setModalDataHoraAberto(false);
      alert('Agendamento realizado com sucesso! O veículo já consta no pátio.');
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
                          <td style={{ padding: '12px' }}>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</td>
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
      {/* MODAL PASSO 1: ESCOLHA DE SERVIÇO */}
      {/* ========================================== */}
      {modalServicoAberto && (
          <EscolhaServicoCliente 
              aoAvancar={avancarParaVeiculo} 
              aoCancelar={cancelarAgendamento} 
          />
      )}

      {/* ========================================== */}
      {/* MODAL PASSO 2: SELEÇÃO DE VEÍCULO         */}
      {/* ========================================== */}
      {modalVeiculoAberto && (
          <EscolhaVeiculoCliente 
              servicoSelecionado={dadosAgendamento.servico}
              aoAvancar={avancarParaLevaTras}
              aoVoltar={voltarParaServico}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {/* ========================================== */}
      {/* MODAL PASSO 3: MODALIDADE LEVA E TRÁS     */}
      {/* ========================================== */}
      {modalLevaTrasAberto && (
          <EscolhaLevaTrasCliente 
              servicoSelecionado={dadosAgendamento.servico}
              veiculoSelecionado={dadosAgendamento.veiculo}
              aoAvancar={avancarParaDataHora}
              aoVoltar={voltarParaVeiculo}
              aoCancelar={cancelarAgendamento}
          />
      )}

      {/* ========================================== */}
      {/* MODAL PASSO 4: DATA E HORÁRIO             */}
      {/* ========================================== */}
      {modalDataHoraAberto && (
          <EscolhaHorarioCliente 
              dadosAgendamento={dadosAgendamento}
              aoConcluir={concluirAgendamentoComSucesso}
              aoVoltar={voltarParaLevaTras}
              aoCancelar={cancelarAgendamento}
          />
      )}

    </div>
  );
}