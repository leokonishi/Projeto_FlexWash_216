import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  const [statusVeiculo, setStatusVeiculo] = useState('concluido');
  const [etapaAvaliacaoAberta, setEtapaAvaliacaoAberta] = useState(false);
  const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    async function buscarDadosClienteBackend() {
      try {
        const token = localStorage.getItem('token_flexwash');
        if (!token) {
          navigate('/login');
          return;
        }

        // Lê o ID do cliente diretamente do token JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        const clienteId = payload.id;

        // Busca o histórico real de serviços deste cliente
        const resposta = await fetch(`${API_URL}/api/execucoes/cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resposta.ok) {
          const dados = await resposta.json();
          setUltimosAgendamentos(dados);

          // Atualiza o card de "Status Atual" com base no serviço mais recente
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

  const lidarComAvaliacao = async (acao) => {
    // Aqui você integrará futuramente com uma rota de avaliação, se desejar.
    try {
      if (acao === 'concluir') {
        alert('Obrigado pela avaliação! Serviço concluído com sucesso.');
      } else {
        alert('Sua contestação foi registrada. Nossa equipe entrará em contato.');
      }
    } catch (erro) {
      console.error("Erro ao enviar avaliação:", erro);
    } finally {
      setEtapaAvaliacaoAberta(false);
    }
  };

  const lidarComLogout = () => {
    localStorage.removeItem('token_flexwash');
    navigate('/login');
  };

  // Função auxiliar para pintar o status dinamicamente na tabela
  const renderStatusBadge = (status) => {
    if (status === 'Aguardando') {
      return <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Aguardando</span>;
    } else if (status === 'Em Andamento') {
      return <span style={{ background: '#bfdbfe', color: '#1e3a8a', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Em Andamento</span>;
    } else {
      return <span style={{ background: '#bbf7d0', color: '#166534', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>Concluído</span>;
    }
  };

  return (
    <div className="home-cliente-pagina-completa">
      
      {/* Navbar Superior (Padrão Admin) */}
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

      {/* Conteúdo Principal */}
      <main className="home-cliente-container">
        
        {/* 1. Card de Boas-Vindas */}
        <div className="home-cliente-banner">
          <h1>Bem-vindo ao Flex Wash</h1>
          <p>Gestão inteligente e estética automotiva de alto padrão para o seu veículo.</p>
        </div>

        {/* Grid de Seções */}
        <div className="home-cliente-grid">
          
          {/* 2. Status do Serviço Atual */}
          <div className="home-cliente-card">
            <h3>Status Atual do Veículo</h3>
            
            <div className="home-cliente-status-box">
              <p><strong>Situação atual:</strong> 
                <span className="badge-status">
                  {statusVeiculo === 'indo_buscar' && 'Veículo indo buscar'}
                  {statusVeiculo === 'no_patio' && 'Veículo no pátio (Aguardando)'}
                  {statusVeiculo === 'em_andamento' && 'Serviço em andamento'}
                  {statusVeiculo === 'indo_entrega' && 'Indo fazer a entrega do veículo'}
                  {statusVeiculo === 'concluido' && 'Nenhum serviço em andamento'}
                </span>
              </p>
            </div>

            {(statusVeiculo === 'indo_entrega' || statusVeiculo === 'em_andamento') && !etapaAvaliacaoAberta && (
              <button 
                onClick={() => setEtapaAvaliacaoAberta(true)}
                className="btn-sucesso"
              >
                Avaliar Serviço & Pagamento
              </button>
            )}

            {etapaAvaliacaoAberta && (
              <div className="box-avaliacao-interna">
                <p>O serviço foi entregue do jeito esperado? Escolha uma opção:</p>
                <div className="grupo-botoes-avaliacao">
                  <button 
                    onClick={() => lidarComAvaliacao('concluir')}
                    className="btn-aprovar"
                  >
                    Concluir / Aprovar
                  </button>
                  <button 
                    onClick={() => lidarComAvaliacao('contestar')}
                    className="btn-contestar"
                  >
                    Contestar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Card Intuitivo para Novo Agendamento */}
          <div className="home-cliente-card flex-between">
            <div>
              <h3>Novo Agendamento</h3>
              <p className="texto-descricao-card">Precisa deixar seu carro brilhando de novo? Agende um horário com nossa equipe em poucos cliques.</p>
            </div>
            <button 
              onClick={() => alert('Abrir fluxo de novo agendamento')}
              className="btn-primario"
            >
              Agendar Nova Lavagem
            </button>
          </div>

        </div>

        {/* 4. Informações sobre os Últimos Agendamentos */}
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
                        <td style={{ padding: '12px' }}>
                          <strong>{item.marca} {item.modelo}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>Placa: {item.placa}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {item.pacote_nome || 'Serviço Avulso'}
                          {item.servicos_extras && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>+ {item.servicos_extras}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          R$ {Number(item.valor_total).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {renderStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}