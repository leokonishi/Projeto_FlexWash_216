import React, { useEffect, useState } from 'react';
import { User, Users, X, Check } from 'lucide-react';
import { apiFetch, API_URL } from '../utils/api';

// Escolha de quem lava o carro. A comissão do serviço é dividida igualmente entre as pessoas marcadas.
// Usado ao iniciar a lavagem no pátio e para corrigir a equipe depois.
// unico: escolhe só uma pessoa (ex.: motorista do leva e traz). nota: texto de ajuda abaixo da lista.
export default function ModalEquipe({
  titulo, descricao, selecionadosIniciais = [], textoConfirmar = 'Confirmar', aoConfirmar, aoFechar,
  unico = false, nota = 'A comissão deste carro é dividida igualmente entre quem estiver marcado.', icone: Icone = Users
}) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionados, setSelecionados] = useState(selecionadosIniciais.map(Number));
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/funcionarios`);
        const json = await res.json().catch(() => ({}));
        const lista = Array.isArray(json) ? json : (json.dados || []);
        setFuncionarios(lista);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const alternar = (id) => setSelecionados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : unico ? [id] : [...atual, id]));

  const confirmar = async () => {
    if (selecionados.length === 0 || enviando) return;
    setEnviando(true);
    try {
      await aoConfirmar(selecionados);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-tinta-950/55 p-4 backdrop-blur-sm animate-surgir sm:items-center">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-elevada animate-subir">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca-50 text-marca-600"><Icone size={20} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-tinta-950">{titulo}</h3>
            {descricao && <p className="mt-0.5 text-sm text-tinta-500">{descricao}</p>}
          </div>
          <button type="button" onClick={aoFechar} className="-mr-2 -mt-1 grid size-9 place-items-center rounded-full text-tinta-500 hover:bg-tinta-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          {carregando ? (
            <div className="h-10 animate-pulse rounded-xl bg-tinta-100" />
          ) : funcionarios.length === 0 ? (
            <p className="text-sm text-tinta-500">Nenhum funcionário cadastrado. Cadastre a equipe na aba Funcionários.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {funcionarios.map((f) => {
                const marcado = selecionados.includes(Number(f.id));
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => alternar(Number(f.id))}
                    aria-pressed={marcado}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                      marcado ? 'bg-verde-600 text-white' : 'bg-tinta-100 text-tinta-700 hover:bg-tinta-200'
                    }`}
                  >
                    {marcado ? <Check size={14} /> : <User size={14} />}
                    {f.nome}
                  </button>
                );
              })}
            </div>
          )}
          {nota && <p className="mt-3 text-xs text-tinta-400">{nota}</p>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="fw-btn-contorno" onClick={aoFechar}>Voltar</button>
          <button type="button" className="fw-btn-primario" disabled={selecionados.length === 0 || enviando} onClick={confirmar}>
            {enviando ? 'Salvando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
