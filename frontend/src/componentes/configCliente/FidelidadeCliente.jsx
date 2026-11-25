import React, { useEffect, useState } from 'react';
import { Award, Check, Zap, Ticket, Copy } from 'lucide-react';
import { apiFetch, API_URL } from '../../utils/api';
import { obterSessao } from '../../utils/sessao';
import { hojeLocal } from '../../utils/datas';

const dataBr = (texto) => {
  if (!texto) return '';
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
};

// Banner da promoção relâmpago (movimento fraco) + cartão de fidelidade com os selos.
// `aoUsarCupom(codigo)` abre o agendamento já com o cupom preenchido.
// Último resultado guardado no navegador: a tela já abre com a cartela e os cupons
// e só atualiza quando o servidor responde.
const CHAVE_CACHE = (clienteId) => `fidelidade_flexwash_${clienteId}`;
const lerCache = (clienteId) => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CACHE(clienteId)) || 'null');
    // Promoção relâmpago só vale no dia em que foi guardada
    if (salvo?.promocao?.valido_para_data && salvo.promocao.valido_para_data !== hojeLocal()) salvo.promocao = null;
    return salvo;
  } catch {
    return null;
  }
};

export default function FidelidadeCliente({ aoUsarCupom }) {
  const clienteId = obterSessao()?.id;
  const [cache] = useState(() => (clienteId ? lerCache(clienteId) : null));
  const [fidelidade, setFidelidade] = useState(cache?.fidelidade ?? null);
  const [promocao, setPromocao] = useState(cache?.promocao ?? null);
  const [copiado, setCopiado] = useState(null);

  useEffect(() => {
    let ativo = true;
    // As duas respostas chegam e aparecem de forma independente (uma não espera a outra)
    const novo = { fidelidade: cache?.fidelidade ?? null, promocao: cache?.promocao ?? null };
    const guardar = () => {
      try { if (clienteId) localStorage.setItem(CHAVE_CACHE(clienteId), JSON.stringify(novo)); } catch { /* sem armazenamento */ }
    };
    apiFetch(`${API_URL}/api/me/fidelidade`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => { if (ativo && dados) { setFidelidade(dados); novo.fidelidade = dados; guardar(); } })
      .catch((erro) => console.error('Erro ao carregar a fidelidade:', erro));
    apiFetch(`${API_URL}/api/me/promocoes`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => { if (ativo && dados) { setPromocao(dados.promocao); novo.promocao = dados.promocao; guardar(); } })
      .catch((erro) => console.error('Erro ao carregar as promoções:', erro));
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copiar = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      // Sem permissão de área de transferência: o código continua visível na tela
    }
  };

  const mostrarFidelidade = fidelidade?.ativo;
  if (!promocao && !mostrarFidelidade) return null;

  // Acabou de completar o ciclo e o cupom está disponível: mostra a cartela cheia
  const cartelaCheia = mostrarFidelidade && fidelidade.visitas_no_ciclo === 0 && fidelidade.visitas_concluidas > 0 && fidelidade.cupons_disponiveis.length > 0;
  const preenchidos = cartelaCheia ? fidelidade.meta : fidelidade?.visitas_no_ciclo || 0;
  const selos = mostrarFidelidade ? Array.from({ length: fidelidade.meta }, (_, i) => i < preenchidos) : [];

  return (
    <div className="space-y-4">
      {promocao && (
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-ouro-400 to-ouro-500 p-5 text-tinta-950 shadow-suave sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/70"><Zap size={22} /></span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide">Promoção relâmpago</p>
                <p className="mt-0.5 font-display text-lg font-extrabold leading-tight">{promocao.descricao}</p>
                <p className="mt-1 text-sm">
                  Para lavagens marcadas em <strong>{dataBr(promocao.valido_para_data)}</strong>. Cupom{' '}
                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono font-bold">{promocao.codigo}</span>
                </p>
              </div>
            </div>
            <button onClick={() => aoUsarCupom(promocao.codigo)} className="fw-btn-escuro h-11 shrink-0 px-5">
              <Ticket size={17} /> Agendar com desconto
            </button>
          </div>
        </section>
      )}

      {mostrarFidelidade && (
        <section className="fw-card p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ouro-50 text-ouro-600"><Award size={22} /></span>
              <div>
                <p className="fw-rotulo-secao">Programa de fidelidade</p>
                <p className="mt-0.5 font-semibold text-tinta-900">
                  {cartelaCheia || fidelidade.cupons_disponiveis.length > 0
                    ? 'Você ganhou um benefício!'
                    : `Faltam ${fidelidade.faltam} ${fidelidade.faltam === 1 ? 'visita' : 'visitas'} para ganhar ${fidelidade.beneficio}`}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-tinta-100 px-2.5 py-1 text-xs font-bold text-tinta-700">
              {preenchidos}/{fidelidade.meta}
            </span>
          </div>

          <ol className="mt-4 flex flex-wrap gap-2" aria-label={`${preenchidos} de ${fidelidade.meta} visitas`}>
            {selos.map((feito, i) => (
              <li
                key={i}
                className={`grid size-9 place-items-center rounded-full text-xs font-bold sm:size-10 ${
                  feito ? 'bg-verde-500 text-white' : i === fidelidade.meta - 1 ? 'border-2 border-dashed border-ouro-400 text-ouro-600' : 'bg-tinta-100 text-tinta-400'
                }`}
              >
                {feito ? <Check size={16} strokeWidth={3} /> : i === fidelidade.meta - 1 ? <Award size={16} /> : i + 1}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-tinta-500">
            Cada visita concluída conta um selo, mesmo com vários carros no mesmo agendamento.
          </p>

          {fidelidade.cupons_disponiveis.length > 0 && (
            <ul className="mt-4 space-y-2">
              {fidelidade.cupons_disponiveis.map(c => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-verde-200 bg-verde-50 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-verde-800">{c.descricao}</p>
                    <button onClick={() => copiar(c.codigo)} className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-sm font-bold text-tinta-900">
                      {c.codigo} {copiado === c.codigo ? <Check size={14} className="text-verde-600" /> : <Copy size={14} className="text-tinta-400" />}
                    </button>
                  </div>
                  <button onClick={() => aoUsarCupom(c.codigo)} className="fw-btn-primario h-9 px-3 text-sm">
                    <Ticket size={15} /> Usar no agendamento
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
