import React, { useState } from 'react';

export default function SecaoMarcas({ abrirAlerta }) {
  const [marcas, setMarcas] = useState([
    { id: 1, nome: 'Audi' },
    { id: 2, nome: 'BMW' },
    { id: 3, nome: 'Chevrolet' },
    { id: 4, nome: 'Ford' }
  ]);

  const [modalAberto, setModalAberto] = useState(false);

  const handleEditar = (marca) => {
    abrirAlerta(
      'Alterar Marca',
      `Tem certeza que deseja editar a marca ${marca.nome}?`,
      () => {
        setModalAberto(true);
      }
    );
  };

  const handleExcluir = (id, nome) => {
    abrirAlerta(
      'Excluir Marca',
      `Tem certeza que deseja remover "${nome}"? Esta ação removerá a marca da lista de opções no pátio.`,
      () => {
        setMarcas(marcas.filter(m => m.id !== id));
      },
      'perigo'
    );
  };

  return (
    <div className="pc-card">
      <div className="pc-card-header">
        <h3 className="pc-titulo">MARCAS ATENDIDAS</h3>
        <button className="btn-novo-item" onClick={() => setModalAberto(true)}>
          + Nova Marca
        </button>
      </div>

      <div className="pc-lista-scroll" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
        {marcas.map(marca => (
          <div key={marca.id} className="pc-item-lista" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#1e293b' }}>{marca.nome}</span>
            <div className="pc-item-acoes">
              <button className="pc-btn-acao" onClick={() => handleEditar(marca)}>✎</button>
              <button className="pc-btn-acao" onClick={() => handleExcluir(marca.id, marca.nome)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE MARCA */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Cadastrar Marca</h3>
            
            <div className="modal-form-group">
              <label>NOME DA MONTADORA / MARCA</label>
              <input type="text" placeholder="Ex: Volkswagen" />
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={() => setModalAberto(false)}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}