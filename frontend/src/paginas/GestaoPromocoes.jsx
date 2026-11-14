import React, { useEffect, useState } from 'react';
import { Award, Zap, Ticket, Check, Loader2, Users, Gauge, Power } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import { apiFetch, API_URL } from '../utils/api';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (texto) => {
  if (!texto) return '';
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
};
const ORIGEM = { fidelidade: 'Fidelidade', movimento_fraco: 'Relâmpago', manual: 'Manual' };

// Escolha do benefício (fidelidade ou movimento fraco): % de desconto ou um extra grátis
function CampoBeneficio({ prefixo, form, mudar, extras }) {
  const tipo = form[`${prefixo}_tipo`];
  return (
    <div className="space-y-3">
      <span className="fw-label">Benefício</span>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-tinta-100 p-1">
        {[['percentual', '% de desconto'], ['extra_gratis', 'Extra grátis']].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => mudar(`${prefixo}_tipo`, valor)}
            className={`h-9 rounded-lg text-sm font-semibold transition-all ${tipo === valor ? 'bg-white text-tinta-950 shadow-sm' : 'text-tinta-500 hover:text-tinta-800'}`}
          >
            {texto}
          </button>
        ))}
      </div>
      {tipo === 'percentual' ? (
        <div>
          <label htmlFor={`${prefixo}-pct`} className="fw-label">Desconto nos serviços (%)</label>
          <input id={`${prefixo}-pct`} className="fw-input" type="number" min="1" max="100" step="0.5"
            value={form[`${prefixo}_percentual`]} onChange={(e) => mudar(`${prefixo}_percentual`, e.target.value)} />
          <p className="mt-1 text-xs text-tinta-500">Vale sobre pacote e extras. A taxa do leva e traz não tem desconto.</p>
        </div>
      ) : (
        <div>
          <label htmlFor={`${prefixo}-extra`} className="fw-label">Extra que sai grátis</label>
          <select id={`${prefixo}-extra`} className="fw-input cursor-pointer"
            value={form[`${prefixo}_extra_id`] ?? ''} onChange={(e) => mudar(`${prefixo}_extra_id`, e.target.value ? Number(e.target.value) : null)}>
            <option value="">Escolha um extra</option>
            {extras.map(ex => <option key={ex.id} value={ex.id}>{ex.nome}</option>)}
          </select>
          <p className="mt-1 text-xs text-tinta-500">Entra grátis no primeiro carro do agendamento.</p>
        </div>
      )}
    </div>
  );
}

function Interruptor({ ligado, aoMudar, rotulo }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => aoMudar(!ligado)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-tinta-50 px-3 py-2.5 text-left ring-1 ring-tinta-200">
      <span className="text-sm font-medium text-tinta-800">{rotulo}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${ligado ? 'bg-verde-500' : 'bg-tinta-300'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export default function GestaoPromocoes({ abrirAlerta }) {
  const [painel, setPainel] = useState(null);
  const [form, setForm] = useState(null);
  const [extras, setExtras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const avisar = (titulo, mensagem, tipo = 'aviso') => abrirAlerta(titulo, mensagem, () => {}, tipo);

  const carregar = async () => {
    try {
      const [resPainel, resExtras] = await Promise.all([
        apiFetch(`${API_URL}/api/admin/promocoes`),
        apiFetch(`${API_URL}/api/extras`)
      ]);
      const json = await resPainel.json().catch(() => ({}));
      if (!resPainel.ok) throw new Error(json.erro || 'Erro ao carregar as promoções.');
      setPainel(json);
      setForm(json.config);
      if (resExtras.ok) setExtras(await resExtras.json());
    } catch (erro) {
      avisar('Erro', erro.message, 'perigo');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mudar = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const corpo = {
        ...form,
        fidelidade_meta_visitas: Number(form.fidelidade_meta_visitas),
        fidelidade_percentual: Number(form.fidelidade_percentual),
        movimento_meta_carros: Number(form.movimento_meta_carros),
        movimento_percentual: Number(form.movimento_percentual)
      };
      const res = await apiFetch(`${API_URL}/api/admin/promocoes/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || 'Não foi possível salvar.');
      avisar('Sucesso', 'Configuração das promoções salva!');
      carregar();
    } catch (erro) {
      avisar('Atenção', erro.message, 'perigo');
    } finally {
      setSalvando(false);
    }
  };

  const gerarAgora = async (forcar = false) => {
    setGerando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/promocoes/movimento-fraco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcar })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || 'Não foi possível gerar a promoção.');
      avisar('Promoção criada', `Cupom ${json.cupom.codigo}: ${json.cupom.descricao}, para hoje. Os clientes já veem o aviso no painel.`);
      carregar();
    } catch (erro) {
      avisar('Atenção', erro.message, 'perigo');
    } finally {
      setGerando(false);
    }
  };

  const pedirGeracao = () => {
    const mov = painel.movimento_hoje;
    if (mov.abaixo_da_meta) return gerarAgora(false);
    abrirAlerta('Dia dentro da meta', `Hoje já tem ${mov.carros} carro(s) e a meta é ${mov.meta}. Gerar a promoção relâmpago mesmo assim?`, () => gerarAgora(true), 'aviso');
  };

  const alternarCupom = async (cupom) => {
    try {
      const res = await apiFetch(`${API_URL}/api/admin/promocoes/${cupom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !cupom.ativo })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || 'Não foi possível alterar o cupom.');
      carregar();
    } catch (erro) {
      avisar('Atenção', erro.message, 'perigo');
    }
  };

  if (carregando || !painel || !form) {
    return (
      <div className="mx-auto max-w-7xl">
        <CabecalhoPagina titulo="Promoções" subtitulo="Fidelidade e promoção por movimento fraco." />
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-tinta-100" />)}</div>
      </div>
    );
  }

  const mov = painel.movimento_hoje;
  const pctMeta = mov.meta > 0 ? Math.min(100, Math.round((mov.carros / mov.meta) * 100)) : 100;
  const indicadores = [
    { nome: 'Cupons usados', valor: painel.metricas.resgates },
    { nome: 'Desconto concedido', valor: moeda(painel.metricas.desconto_total) },
    { nome: 'Clientes que usaram', valor: painel.metricas.clientes_que_usaram },
    { nome: 'Cupons ativos', valor: painel.metricas.cupons_ativos }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CabecalhoPagina
        titulo="Promoções"
        subtitulo="Programa de fidelidade e cupom relâmpago para os dias de movimento fraco."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {indicadores.map(i => (
          <div key={i.nome} className="fw-card p-4 sm:p-5">
            <p className="text-xs font-semibold text-tinta-500 sm:text-sm">{i.nome}</p>
            <p className="mt-2 truncate font-display text-2xl font-extrabold text-tinta-950">{i.valor}</p>
          </div>
        ))}
      </section>

      <Secao titulo="Movimento de hoje" icone={Gauge}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-tinta-500">{dataBr(mov.data)} · carros agendados e entradas no pátio</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-tinta-950">
              {mov.carros} <span className="text-lg font-bold text-tinta-400">/ meta {mov.meta}</span>
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-tinta-100">
              <div className={`h-full rounded-full ${mov.abaixo_da_meta ? 'bg-ouro-400' : 'bg-verde-500'}`} style={{ width: `${pctMeta}%` }} />
            </div>
            <p className="mt-2 text-xs text-tinta-500">
              {mov.automatico
                ? `Automático ligado: se o dia estiver abaixo da meta às ${mov.hora_verificacao}, o cupom é criado sozinho.`
                : 'Automático desligado: gere o cupom pelo botão quando quiser.'}
            </p>
          </div>
          <div className="shrink-0 md:w-72">
            {mov.promocao ? (
              <div className="rounded-2xl bg-ouro-50 p-4 ring-1 ring-ouro-200">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-ouro-700"><Zap size={14} /> Promoção do dia {mov.promocao.ativo ? 'ativa' : 'desligada'}</p>
                <p className="mt-1 font-mono text-lg font-bold text-tinta-950">{mov.promocao.codigo}</p>
                <p className="text-sm text-tinta-600">{mov.promocao.descricao}</p>
              </div>
            ) : (
              <button onClick={pedirGeracao} disabled={gerando} className="fw-btn-ouro h-12 w-full">
                {gerando ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />} Gerar promoção relâmpago
              </button>
            )}
          </div>
        </div>
      </Secao>

      <form onSubmit={salvar} className="grid items-start gap-6 lg:grid-cols-2">
        <Secao titulo="Fidelidade" subtitulo="A cada N visitas concluídas o cliente ganha um cupom." icone={Award}>
          <div className="space-y-4">
            <Interruptor ligado={form.fidelidade_ativa} aoMudar={(v) => mudar('fidelidade_ativa', v)} rotulo="Programa de fidelidade ligado" />
            <div>
              <label htmlFor="fid-meta" className="fw-label">Visitas para ganhar o benefício</label>
              <input id="fid-meta" className="fw-input" type="number" min="1" max="100"
                value={form.fidelidade_meta_visitas} onChange={(e) => mudar('fidelidade_meta_visitas', e.target.value)} />
              <p className="mt-1 text-xs text-tinta-500">Um agendamento com vários carros conta como uma visita. Entradas pelo pátio também contam.</p>
            </div>
            <CampoBeneficio prefixo="fidelidade" form={form} mudar={mudar} extras={extras} />
          </div>
        </Secao>

        <Secao titulo="Movimento fraco" subtitulo="Cupom relâmpago quando o dia tiver poucos carros." icone={Zap}>
          <div className="space-y-4">
            <Interruptor ligado={form.movimento_ativo} aoMudar={(v) => mudar('movimento_ativo', v)} rotulo="Gerar o cupom automaticamente" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mov-meta" className="fw-label">Meta de carros por dia</label>
                <input id="mov-meta" className="fw-input" type="number" min="0"
                  value={form.movimento_meta_carros} onChange={(e) => mudar('movimento_meta_carros', e.target.value)} />
              </div>
              <div>
                <label htmlFor="mov-hora" className="fw-label">Verificar a partir de</label>
                <input id="mov-hora" className="fw-input" type="time"
                  value={form.movimento_hora_verificacao} onChange={(e) => mudar('movimento_hora_verificacao', e.target.value)} />
              </div>
            </div>
            <CampoBeneficio prefixo="movimento" form={form} mudar={mudar} extras={extras} />
            <p className="text-xs text-tinta-500">O cupom relâmpago vale para lavagens marcadas no mesmo dia, uma vez por cliente.</p>
          </div>
        </Secao>

        <div className="flex justify-end lg:col-span-2">
          <button type="submit" disabled={salvando} className="fw-btn-primario px-6">
            {salvando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Salvar configuração
          </button>
        </div>
      </form>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Secao titulo="Clientes na fidelidade" icone={Users} semPadding>
          {painel.clientes_fidelidade.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-tinta-500">Nenhuma visita concluída ainda.</p>
          ) : (
            <ul className="divide-y divide-tinta-100">
              {painel.clientes_fidelidade.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-tinta-900">{c.nome}</span>
                    <span className="text-xs text-tinta-500">{c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'} no total</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-tinta-100 px-2.5 py-1 text-xs font-bold text-tinta-700">
                    {c.no_ciclo}/{form.fidelidade_meta_visitas}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Cupons" icone={Ticket} semPadding>
          {painel.cupons.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-tinta-500">Nenhum cupom gerado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="fw-tabela">
                <thead>
                  <tr>
                    <th>Cupom</th>
                    <th>Benefício</th>
                    <th className="hidden md:table-cell">Para</th>
                    <th>Usos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {painel.cupons.map(c => (
                    <tr key={c.id} className={c.ativo ? '' : 'opacity-50'}>
                      <td>
                        <p className="font-mono text-sm font-bold text-tinta-900">{c.codigo}</p>
                        <p className="text-xs text-tinta-500">{ORIGEM[c.origem]}</p>
                      </td>
                      <td className="text-sm text-tinta-700">{c.descricao}</td>
                      <td className="hidden text-sm text-tinta-600 md:table-cell">
                        {c.cliente_nome || (c.valido_para_data ? `Todos · ${dataBr(c.valido_para_data)}` : 'Todos')}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        <span className="font-semibold text-tinta-900">{c.usos}</span>
                        {Number(c.desconto_total) > 0 && <span className="block text-xs text-verde-700">- {moeda(c.desconto_total)}</span>}
                      </td>
                      <td className="text-right">
                        {c.origem !== 'fidelidade' && (
                          <button onClick={() => alternarCupom(c)} className="grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800"
                            title={c.ativo ? 'Desligar cupom' : 'Religar cupom'} aria-label={c.ativo ? `Desligar ${c.codigo}` : `Religar ${c.codigo}`}>
                            <Power size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </div>
    </div>
  );
}
