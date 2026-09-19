import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/home_cliente.css';

export default function PaginaCliente() {
  const navigate = useNavigate();
  
  // Exemplo de estado para simular o status atual do veículo no lava rápido
  // Opções: 'indo_buscar', 'no_patio', 'em_andamento', 'indo_entrega', 'concluido'
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
    <div style={{ padding: '30px', backgroundColor: '#0d1322', minHeight: '100vh', color: '#fff', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* 1. Card de Boas-Vindas */}
      <div style={{ background: 'linear-gradient(90deg, #0052cc, #2684ff)', padding: '25px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Bem-vindo(a) ao Flex Wash! 🚗✨</h1>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Gestão inteligente e estética automotiva de alto padrão para o seu veículo.</p>
      </div>

      {/* Grid de Seções */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* 2. Status do Serviço Atual */}
        <div style={{ background: '#1a2639', padding: '20px', borderRadius: '15px', border: '1px solid #2a3b5c' }}>
          <h3 style={{ marginTop: 0, color: '#2684ff', borderBottom: '1px solid #2a3b5c', paddingBottom: '10px' }}>Status Atual do Veículo</h3>
          
          <div style={{ margin: '15px 0', fontSize: '15px' }}>
            <p><strong>Situação atual:</strong> 
              <span style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ffc107', color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                {statusVeiculo === 'indo_buscar' && 'Veículo indo buscar 🚙'}
                {statusVeiculo === 'no_patio' && 'Veículo no pátio 🅿️'}
                {statusVeiculo === 'em_andamento' && 'Serviço em andamento 🧽'}
                {statusVeiculo === 'indo_entrega' && 'Indo fazer a entrega do veículo 🚚'}
                {statusVeiculo === 'concluido' && 'Serviço Finalizado ✅'}
              </span>
            </p>
          </div>

          {/* Simulação de gatilho para avaliação quando chegar na etapa de pagamento/entrega */}
          {(statusVeiculo === 'indo_entrega' || statusVeiculo === 'em_andamento') && !etapaAvaliacaoAberta && (
            <button 
              onClick={() => setEtapaAvaliacaoAberta(true)}
              style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
            >
              Avaliar Serviço & Pagamento 💳
            </button>
          )}

          {etapaAvaliacaoAberta && (
            <div style={{ background: '#0d1322', padding: '15px', borderRadius: '10px', marginTop: '15px', border: '1px solid #28a745' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>O serviço foi entregue do jeito esperado? Escolha uma opção:</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => lidarComAvaliacao('concluir')}
                  style={{ flex: 1, padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Concluir / Aprovar 👍
                </button>
                <button 
                  onClick={() => lidarComAvaliacao('contestar')}
                  style={{ flex: 1, padding: '10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Contestar ⚠️
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Card Intuitivo para Novo Agendamento */}
        <div style={{ background: '#1a2639', padding: '20px', borderRadius: '15px', border: '1px solid #2a3b5c', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginTop: 0, color: '#2684ff', borderBottom: '1px solid #2a3b5c', paddingBottom: '10px' }}>Novo Agendamento</h3>
            <p style={{ fontSize: '14px', color: '#a0aec0', marginTop: '10px' }}>Precisa deixar seu carro brilhando de novo? Agende um horário com nossa equipe em poucos cliques.</p>
          </div>
          <button 
            onClick={() => alert('Abrir fluxo de novo agendamento')}
            style={{ width: '100%', padding: '14px', background: '#2684ff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
          >
            Agendar Nova Lavagem ➕
          </button>
        </div>

      </div>

      {/* 4. Informações sobre os Últimos Agendamentos */}
      <div style={{ background: '#1a2639', padding: '20px', borderRadius: '15px', border: '1px solid #2a3b5c', marginTop: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#2684ff', borderBottom: '1px solid #2a3b5c', paddingBottom: '10px' }}>Últimos Agendamentos</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#a0aec0', borderBottom: '1px solid #2a3b5c' }}>
              <th style={{ padding: '8px' }}>Serviço</th>
              <th style={{ padding: '8px' }}>Data</th>
              <th style={{ padding: '8px' }}>Valor</th>
              <th style={{ padding: '8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ultimosAgendamentos.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #2a3b5c' }}>
                <td style={{ padding: '10px' }}>{item.servico}</td>
                <td style={{ padding: '10px' }}>{item.data}</td>
                <td style={{ padding: '10px' }}>{item.valor}</td>
                <td style={{ padding: '10px', color: '#28a745', fontWeight: 'bold' }}>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}