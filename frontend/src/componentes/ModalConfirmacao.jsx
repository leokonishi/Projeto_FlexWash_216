import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

// Modal de confirmação/aviso usado em todo o painel.
// tipo: 'aviso' (informação ou edição) ou 'perigo' (exclusão)
export default function ModalConfirmacao({
  isOpen,
  titulo,
  mensagem,
  onConfirm,
  onCancel,
  tipo = 'aviso'
}) {
  if (!isOpen) return null;
  const perigo = tipo === 'perigo';
  const Icone = perigo ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-tinta-950/55 p-4 backdrop-blur-sm animate-surgir sm:items-center">
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-elevada animate-subir">
        <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${perigo ? 'bg-red-50 text-red-600' : 'bg-marca-50 text-marca-600'}`}>
          <Icone size={26} />
        </span>

        <h3 className="mt-4 font-display text-lg font-bold text-tinta-950">{titulo}</h3>
        <p className="mt-1.5 text-sm text-tinta-500">{mensagem}</p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="fw-btn-contorno" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={perigo ? 'fw-btn bg-red-600 text-white hover:bg-red-700' : 'fw-btn-primario'}
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
