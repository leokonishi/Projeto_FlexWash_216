import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GestaoFuncionarios from './GestaoFuncionarios';
import '../paginas_css/pagina_admin.css';

export default function PaginaAdmin() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');

  const [metricas, setMetricas] = useState({
    veiculosDoDia: 0,
    portes: { pequeno: 0, medio: 0, grande: 0 },
    faturamentoHoje: 0,
    statusPatio: { espera: 0, emAndamento: 0 },
    levaTrazTotal: 0
  });

  const [listaPatio, setListaPatio] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDadosDoBackend() {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

      try {
        const resposta = await fetch(`${API_URL}/api/dashboard`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
        });

        if (!resposta.ok) {
          throw new Error('Erro ao buscar dados do painel');
        }

        setTimeout(() => {
          setMetricas({
            veiculosDoDia: 3,
            portes: { pequeno: 1, medio: 1, grande: 1 },
            faturamentoHoje: 725.00,
            statusPatio: { espera: 0, emAndamento: 1 },
            levaTrazTotal: 1
          });

          setListaPatio([
            {
              id: 1,
              veiculo: 'Honda Civic',
              placa: 'ABC1234 • PRETO',
              entrada: '19/05/2026 00:42',
              porte: 'Pequeno',
              cliente: 'Patricia Menezes',
              telefone: '(11) 95544-3322',
              servico: 'Lavagem Simples',
              valor: 'R$ 40,00',
              responsavel: 'Marcos Souza',
              status: 'Em Andamento',
              levaTraz: true,
              enderecoLevaTraz: 'Rua das Flores, 123 - Barueri/SP'
            }
          ]);
          setCarregando(false);
        }, 500);

      } catch (erro) {
        console.error("Erro ao carregar dados do backend:", erro);
        setCarregando(false);
      }
    }

    buscarDadosDoBackend();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token_flexwash');
    navigate('/login');
  };

  const handleEmBreve = (nomeMenu) => {
    alert(`A secao "${nomeMenu}" esta em desenvolvimento e estara disponivel em breve!`);
  };

  const handleConcluirServico = async (idServico) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    try {
      const resposta = await fetch(`${API_URL}/api/lavagens/${idServico}/concluir`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });

      if (!resposta.ok) {
        throw new Error('Erro ao concluir no servidor');
      }

      alert(`Servico ${idServico} concluido com sucesso!`);
    } catch (erro) {
      alert("Erro ao concluir o servico.");
    }
  };

  return (
    <div className="admin-layout-claro">
      {/* Topo / Header Claro */}
      <header className="header-claro">
        <div className="brand-claro">FLEX WASH</div>
        <div className="header-right-claro">
          <div className="user-profile-claro">
            <div className="user-text-claro">
              <strong>Gustavo Melo</strong>
              <small>ADMINISTRADOR</small>
            </div>
            <div className="user-avatar-claro">GM</div>
          </div>
          <button onClick={handleLogout} className="btn-sair-claro">
            Sair
          </button>
        </div>
      </header>

      <div className="corpo-dashboard-claro">
        {/* Sidebar Esquerda Branca */}
        <aside className="sidebar-claro">
          <div className="nav-titulo-claro">NAVEGACAO</div>
          <button 
            className={abaAtiva === 'inicio' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'}
            onClick={() => setAbaAtiva('inicio')}
          >
            Inicio
          </button>
          <button className="sidebar-btn-claro" onClick={() => handleEmBreve('Clientes')}>
            Clientes
          </button>
          <button className="sidebar-btn-claro" onClick={() => handleEmBreve('Historico / Relatorios')}>
            Historico / Relatorios
          </button>
          <button 
            className={abaAtiva === 'funcionarios' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'}
            onClick={() => setAbaAtiva('funcionarios')}
          >
            Funcionarios (Comissoes)
          </button>

          <div className="nav-titulo-claro separator">CONFIGURACOES ADM</div>
          <button className="sidebar-btn-claro" onClick={() => handleEmBreve('Painel de Controle')}>
            Painel de Controle
          </button>
        </aside>

        {/* Conteudo Principal Claro */}
        <main className="main-claro">
          
          {/* Sub-menu de Abas Superiores (Visivel tambem no Mobile) */}
          <div className="subnav-tabs-claro">
            <button 
              className={abaAtiva === 'inicio' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'}
              onClick={() => setAbaAtiva('inicio')}
            >
              Inicio
            </button>
            <button className="subtab-btn-claro" onClick={() => handleEmBreve('Clientes')}>
              Clientes
            </button>
            <button className="subtab-btn-claro" onClick={() => handleEmBreve('Historico')}>
              Historico
            </button>
            <button 
              className={abaAtiva === 'funcionarios' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'}
              onClick={() => setAbaAtiva('funcionarios')}
            >
              Comissoes
            </button>
            <button className="subtab-btn-claro" onClick={() => handleEmBreve('Painel ADM')}>
              Painel ADM
            </button>
          </div>

          {/* ABA 1: VISAO GERAL / INICIO */}
          {abaAtiva === 'inicio' && (
            <>
              {/* Cards de Metricas Dinamicos */}
              <div className="cards-metrica-grid-claro">
                
                {/* Card 1: Veiculos do Dia */}
                <div className="card-m-item-claro">
                  <div className="card-m-header-claro">
                    <div>
                      <span className="card-m-title-claro">VEICULOS DO DIA</span>
                      <h2 className="card-m-number-claro">{metricas.veiculosDoDia}</h2>
                    </div>
                    <div className="card-icon-blue-claro">Carros</div>
                  </div>
                  <div className="card-m-list-claro">
                    <div className="progress-row-claro">
                      <span>Pequeno Porte</span> <strong>{metricas.portes.pequeno}</strong>
                    </div>
                    <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: '33%'}}></div></div>
                    
                    <div className="progress-row-claro mt-2">
                      <span>Medio Porte</span> <strong>{metricas.portes.medio}</strong>
                    </div>
                    <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: '33%'}}></div></div>

                    <div className="progress-row-claro mt-2">
                      <span>Grande Porte</span> <strong>{metricas.portes.grande}</strong>
                    </div>
                    <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: '33%'}}></div></div>
                  </div>
                </div>

                {/* Card 2: Faturamento Hoje */}
                <div className="card-m-item-claro">
                  <div className="card-m-header-claro">
                    <div>
                      <span className="card-m-title-claro">FATURAMENTO HOJE</span>
                      <h2 className="card-m-number-claro text-green-claro">
                        {metricas.faturamentoHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </h2>
                    </div>
                    <div className="card-icon-green-claro">R$</div>
                  </div>
                  <div className="card-footer-info-claro">
                    <span className="tag-meta-claro">Metas</span> Soma de servicos ativos e concluidos.
                  </div>
                </div>

                {/* Card 3: Status do Patio & Leva e Traz */}
                <div className="card-m-item-claro">
                  <div className="card-m-header-claro">
                    <div>
                      <span className="card-m-title-claro">STATUS DO PATIO</span>
                      <h2 className="card-m-number-claro">{metricas.veiculosDoDia} Carro{metricas.veiculosDoDia !== 1 ? 's' : ''}</h2>
                    </div>
                    <div className="card-icon-yellow-claro">Tempo</div>
                  </div>
                  <div className="patio-status-list-claro">
                    <div className="patio-status-row-claro">
                      <span>Leva e Traz</span>
                      <span className="badge-num-claro blue">{metricas.levaTrazTotal}</span>
                    </div>
                    <div className="patio-status-row-claro mt-2">
                      <span>Em Andamento</span>
                      <span className="badge-num-claro">{metricas.statusPatio.emAndamento}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Gestao do Fluxo de Patio com Leva e Traz */}
              <div className="secao-patio-box-claro">
                <div className="secao-patio-header-claro">
                  <div>
                    <h3>Gestao do Fluxo de Patio</h3>
                    <p>Acompanhe e mude os status das lavagens e o servico de Leva e Traz.</p>
                  </div>
                  <button className="btn-painel-operacional-claro" onClick={() => handleEmBreve('Painel Operacional')}>
                    PAINEL OPERACIONAL
                  </button>
                </div>

                <div className="tabela-claro-container">
                  {carregando ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando dados do servidor...</div>
                  ) : (
                    <table className="tabela-claro">
                      <thead>
                        <tr>
                          <th>VEICULO / PLACA</th>
                          <th>PORTE</th>
                          <th>CLIENTE ASSOCIADO</th>
                          <th>LEVA E TRAZ</th>
                          <th>SERVICO & EXTRAS</th>
                          <th>STATUS</th>
                          <th>ACOES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaPatio.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                              Nenhum veiculo no patio no momento.
                            </td>
                          </tr>
                        ) : (
                          listaPatio.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.veiculo}</strong>
                                <div className="placa-sub-claro">{item.placa}</div>
                                <div className="hora-sub-claro">Entrada: {item.entrada}</div>
                              </td>
                              <td>
                                <span className="badge-porte-claro">{item.porte}</span>
                              </td>
                              <td>
                                <strong>{item.cliente}</strong>
                                <div className="tel-sub-claro">{item.telefone}</div>
                              </td>
                              <td>
                                {item.levaTraz ? (
                                  <div>
                                    <span className="badge-leva-traz-sim">Sim</span>
                                    <div className="endereco-sub-claro" title={item.enderecoLevaTraz}>
                                      {item.enderecoLevaTraz}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="badge-leva-traz-nao">Nao</span>
                                )}
                              </td>
                              <td>
                                <strong>{item.servico}</strong>
                                <div className="valor-sub-claro">Total: {item.valor}</div>
                              </td>
                              <td>
                                <span className="status-pill-claro andamento">{item.status}</span>
                              </td>
                              <td>
                                <div className="acoes-btns-claro">
                                  <button className="btn-concluir-claro" onClick={() => handleConcluirServico(item.id)}>
                                    Concluir
                                  </button>
                                  <button className="btn-lixeira-claro" onClick={() => alert(`Excluir item ${item.id}`)}>Excluir</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ABA 2: GESTAO DE FUNCIONARIOS E COMISSOES */}
          {abaAtiva === 'funcionarios' && (
            <GestaoFuncionarios />
          )}

          {/* Botao Flutuante Inferior Direito */}
          <button className="btn-nova-lavagem-flutuante-claro" onClick={() => handleEmBreve('Nova Lavagem')}>
            + Nova Lavagem
          </button>

        </main>
      </div>
    </div>
  );
}