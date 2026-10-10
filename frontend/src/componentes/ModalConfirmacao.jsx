import React from 'react';
import { AlertTriangle } from 'lucide-react'; // Biblioteca de ícones leve (instale com: npm install lucide-react)

export default function ModalConfirmacao({ 
  isOpen, 
  titulo, 
  mensagem, 
  onConfirm, 
  onCancel, 
  tipo = 'aviso' // pode ser 'aviso' (edição) ou 'perigo' (exclusão)
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content alert">
        
        {/* Ícone de Alerta */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '1rem' 
        }}>
          <div style={{
            background: tipo === 'perigo' ? '#ffe4e6' : '#fef9c3',
            padding: '1rem',
            borderRadius: '50%'
          }}>
            <AlertTriangle 
              size={32} 
              color={tipo === 'perigo' ? '#e11d48' : '#ca8a04'} 
            />
          </div>
        </div>

        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.25rem' }}>
          {titulo}
        </h3>
        
        <p style={{ margin: '0 0 2rem 0', color: '#64748b', fontSize: '0.95rem' }}>
          {mensagem}
        </p>

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
          <button 
            className={`btn-confirmar ${tipo === 'perigo' ? 'perigo' : ''}`} 
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}