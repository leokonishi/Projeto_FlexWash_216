import React, { useState } from 'react';

export default function SecaoExtras({ abrirAlerta }) {
  // Dados de exemplo
  const [extras, setExtras] = useState([
    { id: 1, nome: 'Polimento Técnico', descricao: 'Correção de pintura com remoção de microrriscos e marcas de água.', preco: 250.00, comissao: 5 },
    { id: 2, nome: 'Higienização Detalhada', descricao: 'Limpeza profunda de estofados, carpetes, portas e forro com extratora.', preco: 150.00, comissao: 5 },
    { id: 3, nome: 'Limpeza de Motor', descricao: 'Limpeza segura do cofre com produtos adequados e finalização.', preco: 80.00, comissao: 5 },
    { id: 4, nome: 'Cristalização de Vidros', descricao: 'Aplicação de impermeabilizante repelente de água em todos os vidros.', preco: 50.00, comissao: 5 }
  ]);

  const [modalAberto, setModalAberto] = useState(false);

  const handleEditar = (extra) => {
    abrirAlerta(
      'Alterar Serviço Adicional',
      'Tem certeza de que deseja carregar os dados deste serviço extra para edição?',
      () => {
        setModalAberto(true);
      }
    );
  };

  const handleExcluir = (id) => {
    abrirAlerta(
      'Excluir Serviço Adicional',
      'Essa ação é irreversível. O serviço extra será removido permanentemente.',
      () => {
        setExtras(extras.filter(e => e.id !== id));
      },
      'perigo'
    );
  };

  return (
    <div className="pc-card">
      <div className="pc-card-header">
        <h3 className="pc-titulo">SERVIÇOS ADICIONAIS (EXTRAS)</h3>
        <button className="btn-novo-item" onClick={() => setModalAberto(true)}>
          + Novo Adicional
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {extras.map(extra => (
          <div key={extra.id} className="pc-item-lista" style={{ margin: 0, flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem' }}>{extra.nome}</h4>
              <div className="pc-item-acoes">
                <button className="pc-btn-acao" onClick={() => handleEditar(extra)}>✎</button>
                <button className="pc-btn-acao" onClick={() => handleExcluir(extra.id)}>🗑</button>
              </div>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
              {extra.descricao}
            </p>
            
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 'auto' }}>
              Preço: <strong style={{ color: '#0f172a' }}>R$ {extra.preco.toFixed(2)}</strong> <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span> Comis: <strong style={{ color: '#3b82f6' }}>{extra.comissao}%</strong>
            </div>
          </div>
        ))}
      </div>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Criar Novo Serviço Adicional</h3>
            
            <div className="modal-form-group">
              <label>Nome do Adicional</label>
              <input type="text" placeholder="Ex: Higienização de Ar-Condicionado" />
            </div>

            <div className="modal-form-group">
              <label>O que é este serviço extra / O que está incluso?</label>
              <textarea rows="3" placeholder="Ex: Higienização do sistema..."></textarea>
            </div>

            <div className="modal-form-group">
              <label>Preço Fixo (R$)</label>
              <input type="number" placeholder="120.00" />
            </div>

            <div className="modal-form-group">
              <label>Comissão dos Funcionários (%)</label>
              <input type="number" placeholder="Ex: 5" />
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={() => setModalAberto(false)}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}