import React, { useState } from 'react';
import ModalNovaLavagem from '../componentes/ModalNovaLavagem';
import { useGestaoPatio } from '../hooks/useGestaoPatio'; // Importamos o "cérebro"

// 'AAAA-MM-DD HH:MM' -> { data: 'DD/MM', hora: 'HH:MM' }
const separarAgendamento = (texto) => {
  if (!texto) return null;
  const [dia, hora] = texto.split(' ');
  const [, mes, d] = dia.split('-');
  return { data: `${d}/${mes}`, hora };
};

// Texto e cor do botão de avançar, por status
const BOTAO_STATUS = {
  'Agendado': { texto: 'Recebido ▶', cor: '#7c3aed' },
  'Aguardando': { texto: 'Iniciar ▶', cor: '#3b82f6' },
  'Em Andamento': { texto: 'Concluir ✔', cor: '#10b981' }
};

const ESTILO_AGENDADO = { background: '#ede9fe', color: '#5b21b6' };

export default function DashboardInicio({ perfilUsuario, abrirAlerta }) {
  // 1. Extraímos tudo que precisamos do nosso Custom Hook (agora com o excluirServico!)
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

  return (
    <>
      <div className="cards-metrica-grid-claro">
        {/* Card 1: Veículos do Dia */}
        <div className="card-m-item-claro">
          <div className="card-m-header-claro">
            <div>
              <span className="card-m-title-claro">VEÍCULOS DO DIA</span>
              <h2 className="card-m-number-claro">{metricas.veiculosDoDia}</h2>
            </div>
            <div className="card-icon-blue-claro">Carros</div>
          </div>
          <div className="card-m-list-claro">
            <div className="progress-row-claro"><span>Pequeno Porte</span> <strong>{metricas.portes.pequeno}</strong></div>
            <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: `${(metricas.portes.pequeno / (metricas.veiculosDoDia || 1)) * 100}%`}}></div></div>
            <div className="progress-row-claro mt-2"><span>Médio Porte</span> <strong>{metricas.portes.medio}</strong></div>
            <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: `${(metricas.portes.medio / (metricas.veiculosDoDia || 1)) * 100}%`}}></div></div>
            <div className="progress-row-claro mt-2"><span>Grande Porte</span> <strong>{metricas.portes.grande}</strong></div>
            <div className="progress-bar-bg-claro"><div className="progress-fill-claro" style={{width: `${(metricas.portes.grande / (metricas.veiculosDoDia || 1)) * 100}%`}}></div></div>
          </div>
        </div>

        {/* Card 2: Faturamento (Apenas ADM) */}
        {perfilUsuario === 'administrador' && (
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
            <div className="card-footer-info-claro"><span className="tag-meta-claro">Metas</span> Soma de serviços no pátio.</div>
          </div>
        )}

        {/* Card 3: Status do Pátio */}
        <div className="card-m-item-claro">
          <div className="card-m-header-claro">
            <div>
              <span className="card-m-title-claro">STATUS DO PÁTIO</span>
              <h2 className="card-m-number-claro">{metricas.veiculosDoDia} Carro{metricas.veiculosDoDia !== 1 ? 's' : ''}</h2>
            </div>
            <div className="card-icon-yellow-claro">Tempo</div>
          </div>
          <div className="patio-status-list-claro">
            <div className="patio-status-row-claro"><span>Agendados (ainda não chegaram)</span><span className="badge-num-claro" style={ESTILO_AGENDADO}>{metricas.statusPatio.agendados}</span></div>
            <div className="patio-status-row-claro mt-2"><span>Em Espera</span><span className="badge-num-claro blue">{metricas.statusPatio.espera}</span></div>
            <div className="patio-status-row-claro mt-2"><span>Em Andamento</span><span className="badge-num-claro">{metricas.statusPatio.emAndamento}</span></div>
          </div>
        </div>
      </div>

      {/* Tabela do Pátio */}
      <div className="secao-patio-box-claro">
        <div className="secao-patio-header-claro">
          <div>
            <h3>Gestão do Fluxo de Pátio</h3>
            <p>Acompanhe e mude os status das lavagens. Os agendamentos de hoje aparecem aqui até o carro chegar.</p>
          </div>
          {/* Apenas Funcionários e Admins conseguem adicionar nova lavagem */}
          {perfilUsuario !== 'cliente' && (
            <button 
              className="btn-painel-operacional-claro" 
              style={{ background: '#2563eb', color: 'white', border: 'none' }}
              onClick={() => setModalLavagemAberto(true)}
            >
              + Nova Lavagem
            </button>
          )}
        </div>
        <div className="tabela-claro-container">
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>A carregar dados do pátio...</div>
          ) : (
            <table className="tabela-claro">
              <thead>
                <tr>
                  <th>VEÍCULO / PLACA</th>
                  <th>PORTE</th>
                  <th>CLIENTE ASSOCIADO</th>
                  <th>SERVIÇO & EXTRAS</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {listaPatio.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Nenhum veículo no pátio.</td></tr>
                ) : (
                  listaPatio.map((item) => {
                    const agendado = separarAgendamento(item.data_agendamento);
                    const botao = BOTAO_STATUS[item.status];
                    return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.marca} {item.modelo}</strong>
                        <div className="placa-sub-claro">{item.placa}</div>
                        {item.status === 'Agendado' ? (
                          <div className="hora-sub-claro" style={{ color: '#5b21b6', fontWeight: 600 }}>Agendado: {agendado?.data} às {agendado?.hora}</div>
                        ) : (
                          <div className="hora-sub-claro">Entrada: {new Date(item.data_entrada).toLocaleString('pt-BR')}</div>
                        )}
                      </td>
                      <td><span className="badge-porte-claro">{item.porte}</span></td>
                      <td>
                        <strong>{item.cliente_nome}</strong>
                        {item.tipo_logistica === 'leva_tras' && (
                          <div className="tel-sub-claro" style={{ color: '#b45309', fontWeight: 600 }}>
                            Leva e traz: {item.endereco_busca}
                            {item.cliente_telefone && <div style={{ fontWeight: 400 }}>{item.cliente_telefone}</div>}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{item.pacote_nome || 'Sem Pacote'}</strong>
                        <div className="tel-sub-claro" style={{ color: '#10b981' }}>{item.servicos_extras ? `+ ${item.servicos_extras}` : ''}</div>
                        <div className="valor-sub-claro mt-1">Total: R$ {Number(item.valor_total).toFixed(2)}</div>
                      </td>
                      <td>
                        <span
                          className={`status-pill-claro ${item.status === 'Em Andamento' ? 'andamento' : 'espera'}`}
                          style={item.status === 'Agendado' ? ESTILO_AGENDADO : undefined}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {/* LÓGICA DE PERMISSÕES APLICADA AQUI */}
                        {perfilUsuario === 'cliente' ? (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Apenas Visualização</span>
                        ) : (
                          <div className="acoes-btns-claro" style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Botão de Iniciar/Concluir (Funcionários e Admins) */}
                            {botao && (
                              <button 
                                className="btn-concluir-claro" 
                                style={{ background: botao.cor, flex: 1 }}
                                onClick={() => avancarStatusServico(item.id, item.status)}
                              >
                                {botao.texto}
                              </button>
                            )}

                            {/* LIXEIRA: APENAS PARA ADMINISTRADOR */}
                            {perfilUsuario === 'administrador' && (
                              <button 
                                onClick={() => excluirServico(item.id)}
                                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                title="Remover do Pátio"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Próximos agendamentos (a partir de amanhã) */}
      {perfilUsuario !== 'cliente' && (
        <div className="secao-patio-box-claro" style={{ marginTop: '1.5rem' }}>
          <div className="secao-patio-header-claro">
            <div>
              <h3>Próximos Agendamentos</h3>
              <p>Agendados pelos clientes para os próximos 7 dias. No dia marcado, eles entram no pátio acima.</p>
            </div>
          </div>
          <div className="tabela-claro-container">
            <table className="tabela-claro">
              <thead>
                <tr>
                  <th>DATA / HORA</th>
                  <th>VEÍCULO / PLACA</th>
                  <th>CLIENTE</th>
                  <th>SERVIÇO & EXTRAS</th>
                  <th>MODALIDADE</th>
                </tr>
              </thead>
              <tbody>
                {proximosAgendamentos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Nenhum agendamento nos próximos dias.</td></tr>
                ) : (
                  proximosAgendamentos.map((item) => {
                    const agendado = separarAgendamento(item.data_agendamento);
                    return (
                      <tr key={item.id}>
                        <td><strong>{agendado?.data}</strong><div className="hora-sub-claro">{agendado?.hora}</div></td>
                        <td><strong>{item.marca} {item.modelo}</strong><div className="placa-sub-claro">{item.placa}</div></td>
                        <td><strong>{item.cliente_nome}</strong>{item.cliente_telefone && <div className="tel-sub-claro">{item.cliente_telefone}</div>}</td>
                        <td>
                          <strong>{item.pacote_nome || 'Sem Pacote'}</strong>
                          <div className="tel-sub-claro" style={{ color: '#10b981' }}>{item.servicos_extras ? `+ ${item.servicos_extras}` : ''}</div>
                          <div className="valor-sub-claro mt-1">Total: R$ {Number(item.valor_total).toFixed(2)}</div>
                        </td>
                        <td>
                          {item.tipo_logistica === 'leva_tras'
                            ? <span style={{ color: '#b45309', fontWeight: 600 }}>Leva e traz<div className="tel-sub-claro">{item.endereco_busca}</div></span>
                            : 'Cliente leva'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalLavagemAberto && (
        <ModalNovaLavagem 
          fecharModal={() => setModalLavagemAberto(false)} 
          abrirAlerta={abrirAlerta} 
          atualizarPatio={buscarDadosDoPatio} 
        />
      )}
    </>
  );
}