import React, { useState, useEffect } from 'react';
import { User, PlusCircle, Car, Check } from 'lucide-react';

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
    <div className="overflow-hidden rounded-2xl border border-tinta-200">
      {/* Cabeçalho do Veículo */}
      <div className="flex items-center justify-between gap-3 bg-tinta-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-marca-600 ring-1 ring-tinta-200"><Car size={16} /></span>
          <strong className="truncate text-tinta-900">{veiculo.marca} {veiculo.modelo}</strong>
          <span className="font-mono text-xs uppercase text-tinta-500">{veiculo.placa}</span>
        </div>
        <span className="shrink-0 rounded-full bg-marca-100 px-2.5 py-1 text-xs font-semibold text-marca-800">
          Porte {veiculo.porte || 'Médio'}
        </span>
      </div>

      <div className="space-y-5 p-4">
        {/* Serviço Base */}
        <div>
          <label className="fw-label">Lavagem</label>
          <select
            value={pacoteSelecionado}
            onChange={(e) => setPacoteSelecionado(e.target.value)}
            className="fw-input cursor-pointer"
          >
            <option value="">Selecione o pacote principal...</option>
            {pacotes && pacotes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} — R$ {obterPrecoPorPorte(p).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Serviços Adicionais */}
        <div>
          <span className="fw-label">Extras</span>
          {(!extras || extras.length === 0) ? (
            <p className="text-sm italic text-tinta-400">Nenhum extra cadastrado no sistema.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {extras.map(e => {
                const selecionado = extrasSelecionados.includes(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => toggleExtra(e.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      selecionado ? 'border-marca-500 bg-marca-50 font-semibold text-marca-800' : 'border-tinta-200 bg-white text-tinta-700 hover:border-marca-300'
                    }`}
                  >
                    {selecionado ? <Check size={15} className="text-marca-600" /> : <PlusCircle size={15} className="text-tinta-400" />}
                    {e.nome}
                    <span className={selecionado ? 'text-marca-600' : 'text-verde-700'}>+R$ {obterPrecoPorPorte(e).toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Funcionários Designados */}
        <div>
          <span className="fw-label">Equipe responsável <span className="font-normal text-tinta-400">(divide a comissão)</span></span>
          {(!funcionarios || funcionarios.length === 0) ? (
            <p className="text-sm italic text-tinta-400">Nenhum funcionário disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {funcionarios.map(f => {
                const selecionado = funcionariosSelecionados.includes(f.id);
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => toggleFuncionario(f.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      selecionado ? 'bg-verde-600 text-white' : 'bg-tinta-100 text-tinta-600 hover:bg-tinta-200'
                    }`}
                  >
                    <User size={14} />
                    {f.nome.split(' ')[0]} {/* Mostra só o primeiro nome para não poluir */}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
