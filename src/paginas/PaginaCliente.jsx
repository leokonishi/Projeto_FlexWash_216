import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  // Estado para simular o status atual do veículo no lava rápido
  const [statusVeiculo, setStatusVeiculo] = useState('em_andamento');
  const [etapaAvaliacaoAberta, setEtapaAvaliacaoAberta] = useState(false);

  // Dados mockados para os últimos agendamentos
  const ultimosAgendamentos = [
    { id: 1, servico: 'Lavagem Completa + Cera', data: '10/06/2026', valor: 'R$ 80,00', status: 'Concluído' },
    { id: 2, servico: 'Ducha Simples', data: '25/05/2026', valor: 'R$ 40,00', status: 'Concluído' }
  ];

  const lidarComAvaliacao = (acao) => {
    if (acao === 'concluir') {
      alert('Obrigado pela avaliação! Serviço concluído com sucesso.');
      setStatusVeiculo('concluido');
    } else {
      alert('Sua contestação foi registrada. Nossa equipe entrará em contato.');
    }
    setEtapaAvaliacaoAberta(false);
  };

  return (
    <div className="cliente-container">
      
      {/* 1. Card de Boas-Vindas */}
      <div className="cliente-welcome-card">
        <h1>Bem-vindo(a) ao Flex Wash! 🚗✨</h1>
        <p>Gestão inteligente e estética automotiva de alto padrão para o seu veículo.</p>
      </div>

      {/* Grid de Seções */}
      <div className="cliente-grid">
        
        {/* 2. Status do Serviço Atual */}
        <div className="cliente-card">
          <div>
            <h3>Status Atual do Veículo</h3>
            
            <div className="status-info">
              <p><strong>Situação atual:</strong> 
                <span className="status-badge">
                  {statusVeiculo === 'indo_buscar' && 'Veículo indo buscar 🚙'}
                  {statusVeiculo === 'no_patio' && 'Veículo no pátio 🅿️'}
                  {statusVeiculo === 'em_andamento' && 'Serviço em andamento 🧽'}
                  {statusVeiculo === 'indo_entrega' && 'Indo fazer a entrega do veículo 🚚'}
                  {statusVeiculo === 'concluido' && 'Serviço Finalizado ✅'}
                </span>
              </p>
            </div>
          </div>

          {/* Gatilho para avaliação */}
          {(statusVeiculo === 'indo_entrega' || statusVeiculo === 'em_andamento') && !etapaAvaliacaoAberta && (
            <button 
              onClick={() => setEtapaAvaliacaoAberta(true)}
              className="btn-verde"
            >
              Avaliar Serviço & Pagamento 💳
            </button>
          )}

          {etapaAvaliacaoAberta && (
            <div className="avaliacao-box">
              <p>O serviço foi entregue do jeito esperado? Escolha uma opção:</p>
              <div className="avaliacao-botoes">
                <button 
                  onClick={() => lidarComAvaliacao('concluir')}
                  className="btn-aprovar"
                >
                  Concluir / Aprovar 👍
                </button>
                <button 
                  onClick={() => lidarComAvaliacao('contestar')}
                  className="btn-contestar"
                >
                  Contestar ⚠️
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Card Intuitivo para Novo Agendamento */}
        <div className="cliente-card">
          <div>
            <h3>Novo Agendamento</h3>
            <p style={{ fontSize: '14px', color: '#a0aec0', marginTop: '10px' }}>
              Precisa deixar seu carro brilhando de novo? Agende um horário com nossa equipe em poucos cliques.
            </p>
          </div>
          <button 
            onClick={() => alert('Abrir fluxo de novo agendamento')}
            className="btn-azul"
          >
            Agendar Nova Lavagem ➕
          </button>
        </div>

      </div>

      {/* 4. Informações sobre os Últimos Agendamentos */}
      <div className="cliente-card" style={{ display: 'block' }}>
        <h3>Últimos Agendamentos</h3>
        
        <table className="tabela-historico">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ultimosAgendamentos.map((item) => (
              <tr key={item.id}>
                <td>{item.servico}</td>
                <td>{item.data}</td>
                <td>{item.valor}</td>
                <td className="status-concluido">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}