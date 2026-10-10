import React, { useState, useEffect } from 'react';
import { User, PlusCircle } from 'lucide-react';

export default function ConfiguracaoVeiculo({ 
  veiculo, 
  pacotes, 
  extras, 
  funcionarios, 
  onAtualizar 
}) {
  const [pacoteSelecionado, setPacoteSelecionado] = useState('');
  const [extrasSelecionados, setExtrasSelecionados] = useState([]);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([]);

  // Função central para extrair o preço correto baseado no porte do veículo
  const obterPrecoPorPorte = (item) => {
    if (!item) return 0;
    const porte = veiculo.porte ? veiculo.porte.toLowerCase() : 'médio';
    
    if (porte === 'pequeno' || porte === 'pequena') return Number(item.preco_pequeno || 0);
    if (porte === 'grande') return Number(item.preco_grande || 0);
    return Number(item.preco_medio || 0); // Fallback padrão
  };

  // Atualiza o "Pai" sempre que houver mudanças nos valores
  useEffect(() => {
    let valorTotal = 0;

    const pacote = pacotes.find(p => p.id === Number(pacoteSelecionado));
    if (pacote) valorTotal += obterPrecoPorPorte(pacote);

    extrasSelecionados.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (extra) valorTotal += obterPrecoPorPorte(extra);
    });

    onAtualizar(veiculo.id, {
      pacote_id: pacoteSelecionado,
      extras: extrasSelecionados,
      funcionarios: funcionariosSelecionados,
      valor_total: valorTotal
    });
  }, [pacoteSelecionado, extrasSelecionados, funcionariosSelecionados]);

  // Funções de Toggle (Liga/Desliga)
  const toggleExtra = (id) => {
    setExtrasSelecionados(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const toggleFuncionario = (id) => {
    setFuncionariosSelecionados(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      
      {/* Cabeçalho do Veículo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '600' }}>
            {veiculo.marca} {veiculo.modelo}
          </h4>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>PLACA: {veiculo.placa}</span>
        </div>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '700' }}>
          Porte {veiculo.porte || 'Médio'}
        </span>
      </div>

      {/* Serviço Base */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Serviço de Lavagem Base
        </label>
        <select 
          value={pacoteSelecionado} 
          onChange={(e) => setPacoteSelecionado(e.target.value)}
          style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#f8fafc', cursor: 'pointer' }}
        >
          <option value="">Selecione o pacote principal...</option>
          {pacotes && pacotes.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} — R$ {obterPrecoPorPorte(p).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Serviços Adicionais (Cards Selecionáveis) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Serviços Adicionais (Extras)
        </label>
        
        {(!extras || extras.length === 0) ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhum extra cadastrado no sistema.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {extras.map(e => {
              const selecionado = extrasSelecionados.includes(e.id);
              const preco = obterPrecoPorPorte(e).toFixed(2);
              return (
                <div 
                  key={e.id}
                  onClick={() => toggleExtra(e.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', 
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid',
                    backgroundColor: selecionado ? '#eff6ff' : '#ffffff',
                    borderColor: selecionado ? '#3b82f6' : '#e2e8f0',
                    color: selecionado ? '#1e40af' : '#475569'
                  }}
                >
                  <PlusCircle size={16} color={selecionado ? '#3b82f6' : '#94a3b8'} />
                  <span style={{ fontWeight: selecionado ? '600' : '500', fontSize: '0.9rem' }}>{e.nome}</span>
                  <span style={{ fontSize: '0.8rem', color: selecionado ? '#2563eb' : '#10b981', fontWeight: '600', marginLeft: '0.25rem' }}>
                    +R$ {preco}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Funcionários Designados (Pílulas) */}
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Equipe Responsável (Divisão de Comissão)
        </label>

        {(!funcionarios || funcionarios.length === 0) ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhum funcionário disponível.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {funcionarios.map(f => {
              const selecionado = funcionariosSelecionados.includes(f.id);
              return (
                <div 
                  key={f.id}
                  onClick={() => toggleFuncionario(f.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.85rem',
                    borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid',
                    backgroundColor: selecionado ? '#10b981' : '#f1f5f9',
                    borderColor: selecionado ? '#10b981' : '#e2e8f0',
                    color: selecionado ? '#ffffff' : '#475569',
                    fontWeight: '600', fontSize: '0.85rem'
                  }}
                >
                  <User size={14} />
                  {f.nome.split(' ')[0]} {/* Mostra só o primeiro nome para não poluir */}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}