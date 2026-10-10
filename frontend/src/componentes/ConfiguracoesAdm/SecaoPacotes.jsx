import React, { useState } from 'react';

export default function SecaoPacotes({ abrirAlerta }) {
  // Dados de exemplo (depois virão do backend)
  const [pacotes, setPacotes] = useState([
    { id: 1, nome: 'Lavagem Simples', descricao: 'Limpeza externa rápida com shampoo neutro, aspiração básica.', precoP: 40, precoM: 50, precoG: 60, comissao: 3 },
    { id: 2, nome: 'Lavagem Completa', descricao: 'Ducha de pré-lavagem, limpeza externa completa, higienização dos vidros.', precoP: 60, precoM: 75, precoG: 90, comissao: 5 }
  ]);

  const [modalAberto, setModalAberto] = useState(false);

  const handleEditar = (pacote) => {
    abrirAlerta(
      'Alterar Pacote de Lavagem',
      'Tem certeza de que deseja carregar os dados deste pacote de lavagem para edição?',
      () => {
        // Ação confirmada: Abre o modal preenchido com os dados
        console.log("Abrindo edição do pacote:", pacote.nome);
        setModalAberto(true);
      }
    );
  };

  const handleExcluir = (id) => {
    abrirAlerta(
      'Excluir Pacote',
      'Essa ação é irreversível. O pacote será removido permanentemente do sistema.',
      () => {
        // Ação confirmada: Remove da lista
        setPacotes(pacotes.filter(p => p.id !== id));
      },
      'perigo'
    );
  };

  return (
    <div className="pc-card">
      <div className="pc-card-header">
        <h3 className="pc-titulo">Valores de Lavagem Progressiva por Porte</h3>
        <button className="btn-novo-item" onClick={() => setModalAberto(true)}>
          + Novo Pacote
        </button>
      </div>

      <div className="pc-lista-scroll">
        {pacotes.map(pacote => (
          <div key={pacote.id} className="pc-item-lista">
            <div className="pc-item-info">
              <h4>{pacote.nome}</h4>
              <p>{pacote.descricao}</p>
              
              <div className="pc-item-precos">
                <span className="pc-tag-preco">P: R$ {pacote.precoP.toFixed(2)}</span>
                <span className="pc-tag-preco">M: R$ {pacote.precoM.toFixed(2)}</span>
                <span className="pc-tag-preco">G: R$ {pacote.precoG.toFixed(2)}</span>
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                Comissão do Operador: <strong>{pacote.comissao}%</strong>
              </p>
            </div>

            <div className="pc-item-acoes">
              <button className="pc-btn-acao" onClick={() => handleEditar(pacote)}>✎</button>
              <button className="pc-btn-acao" onClick={() => handleExcluir(pacote.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE PACOTE (Protótipo Verde) */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Criar Novo Pacote de Lavagem</h3>
            
            <div className="modal-form-group">
              <label>Nome do Pacote</label>
              <input type="text" placeholder="Ex: Super Ducha" />
            </div>

            <div className="modal-form-group">
              <label>O que é este serviço / O que está incluso?</label>
              <textarea rows="3" placeholder="Ex: Lavagem de chassi, lavagem de motor..."></textarea>
            </div>

            <div className="modal-grid-3">
              <div className="modal-form-group">
                <label>Pequeno (R$)</label>
                <input type="number" placeholder="40" />
              </div>
              <div className="modal-form-group">
                <label>Médio (R$)</label>
                <input type="number" placeholder="50" />
              </div>
              <div className="modal-form-group">
                <label>Grande (R$)</label>
                <input type="number" placeholder="60" />
              </div>
            </div>

            <div className="modal-form-group">
              <label>Comissão dos Funcionários (%)</label>
              <input type="number" placeholder="Ex: 3" />
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