import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  const [statusVeiculo, setStatusVeiculo] = useState('em_andamento');
  const [etapaAvaliacaoAberta, setEtapaAvaliacaoAberta] = useState(false);
  const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDadosClienteBackend() {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

      try {
        const resposta = await fetch(`${API_URL}/api/cliente/painel`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
        });

        if (!resposta.ok) {
          throw new Error('Erro ao buscar dados do painel do cliente');
        }

        setTimeout(() => {
          setStatusVeiculo('em_andamento');
          setUltimosAgendamentos([
            { id: 1, servico: 'Lavagem Completa + Cera', data: '10/06/2026', valor: 'R$ 80,00', status: 'Concluido' },
            { id: 2, servico: 'Ducha Simples', data: '25/05/2026', valor: 'R$ 40,00', status: 'Concluido' }
          ]);
          setCarregando(false);
        }, 500);

      } catch (erro) {
        console.error("Erro ao conectar com o backend:", erro);
        setUltimosAgendamentos([
          { id: 1, servico: 'Lavagem Completa + Cera', data: '10/06/2026', valor: 'R$ 80,00', status: 'Concluido' }
        ]);
        setCarregando(false);
      }
    }

    buscarDadosClienteBackend();
  }, []);

  const lidarComAvaliacao = async (acao) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    try {
      await fetch(`${API_URL}/api/cliente/avaliacao`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` 
        },
        body: JSON.stringify({ acao })
      });

      if (acao === 'concluir') {
        alert('Obrigado pela avaliacao! Servico concluido com sucesso.');
        setStatusVeiculo('concluido');
      } else {
        alert('Sua contestacao foi registrada. Nossa equipe entrara em contato.');
      }
    } catch (erro) {
      console.error("Erro ao enviar avaliacao:", erro);
      if (acao === 'concluir') {
        alert('Obrigado pela avaliacao! Servico concluido com sucesso.');
        setStatusVeiculo('concluido');
      } else {
        alert('Sua contestacao foi registrada. Nossa equipe entrara em contato.');
      }
    } finally {
      setEtapaAvaliacaoAberta(false);
    }
  };

  const lidarComLogout = () => {
    localStorage.removeItem('token_flexwash');
    navigate('/login');
  };

  return (
    <div className="home-cliente-pagina-completa">
      
      {/* Navbar Superior (Padrao Admin) */}
      <header className="navbar-superior">
        <div className="navbar-conteudo">
          <h2 className="navbar-logo">FLEX WASH</h2>
          
          <div className="navbar-usuario-area">
            <div className="navbar-info-texto">
              <span className="navbar-nome-usuario">Cliente FlexWash</span>
              <span className="navbar-perfil-usuario">AREA DO CLIENTE</span>
            </div>
            <div className="navbar-avatar">CF</div>
            <button onClick={lidarComLogout} className="btn-sair-navbar">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteudo Principal */}
      <main className="home-cliente-container">
        
        {/* 1. Card de Boas-Vindas */}
        <div className="home-cliente-banner">
          <h1>Bem-vindo ao Flex Wash</h1>
          <p>Gestao inteligente e estetica automotiva de alto padrao para o seu veiculo.</p>
        </div>

        {/* Grid de Secoes */}
        <div className="home-cliente-grid">
          
          {/* 2. Status do Servico Atual */}
          <div className="home-cliente-card">
            <h3>Status Atual do Veiculo</h3>
            
            <div className="home-cliente-status-box">
              <p><strong>Situacao atual:</strong> 
                <span className="badge-status">
                  {statusVeiculo === 'indo_buscar' && 'Veiculo indo buscar'}
                  {statusVeiculo === 'no_patio' && 'Veiculo no patio'}
                  {statusVeiculo === 'em_andamento' && 'Servico em andamento'}
                  {statusVeiculo === 'indo_entrega' && 'Indo fazer a entrega do veiculo'}
                  {statusVeiculo === 'concluido' && 'Servico Finalizado'}
                </span>
              </p>
            </div>

            {(statusVeiculo === 'indo_entrega' || statusVeiculo === 'em_andamento') && !etapaAvaliacaoAberta && (
              <button 
                onClick={() => setEtapaAvaliacaoAberta(true)}
                className="btn-sucesso"
              >
                Avaliar Servico & Pagamento
              </button>
            )}

            {etapaAvaliacaoAberta && (
              <div className="box-avaliacao-interna">
                <p>O servico foi entregue do jeito esperado? Escolha uma opcao:</p>
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
              <p className="texto-descricao-card">Precisa deixar seu carro brilhando de novo? Agende um horario com nossa equipe em poucos cliques.</p>
            </div>
            <button 
              onClick={() => alert('Abrir fluxo de novo agendamento')}
              className="btn-primario"
            >
              Agendar Nova Lavagem
            </button>
          </div>

        </div>

        {/* 4. Informacoes sobre os Ultimos Agendamentos */}
        <div className="home-cliente-card secao-tabela">
          <h3>Ultimos Agendamentos</h3>
          
          {carregando ? (
            <p className="texto-carregando">Carregando historico...</p>
          ) : (
            <div className="table-responsive">
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th>Servico</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosAgendamentos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="tabela-vazia">
                        Nenhum agendamento recente encontrado.
                      </td>
                    </tr>
                  ) : (
                    ultimosAgendamentos.map((item) => (
                      <tr key={item.id}>
                        <td>{item.servico}</td>
                        <td>{item.data}</td>
                        <td>{item.valor}</td>
                        <td className="status-concluido">{item.status}</td>
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