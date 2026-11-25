import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, Plus, X, Save, CalendarOff, Trash2 } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import { apiFetch, API_URL } from '../utils/api';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Agenda do lava-rápido: dias que abre, horários de início, vagas por horário,
// prazo de cancelamento pelo cliente e dias fechados (feriados).
export default function GestaoAgenda({ abrirAlerta }) {
  const [form, setForm] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [novoHorario, setNovoHorario] = useState('');
  const [novoBloqueio, setNovoBloqueio] = useState({ data: '', motivo: '' });
  const [salvando, setSalvando] = useState(false);

  const aplicar = (json) => {
    setForm({
      dias_semana: json.dias_semana,
      horarios: json.horarios,
      capacidade_por_horario: json.capacidade_por_horario,
      antecedencia_cancelamento_horas: json.antecedencia_cancelamento_horas
    });
    setBloqueios(json.bloqueios || []);
  };

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`${API_URL}/api/admin/agenda`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) aplicar(json);
      else abrirAlerta?.('Atenção', json.erro || 'Não foi possível carregar a agenda.', () => {}, 'erro');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega uma vez, ao abrir a aba
  }, []);

  const enviar = async (url, metodo, corpo) => {
    const res = await apiFetch(`${API_URL}${url}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      abrirAlerta?.('Não foi possível salvar', json.erro || 'Tente de novo.', () => {}, 'erro');
      return null;
    }
    aplicar(json);
    return json;
  };

  const salvar = async () => {
    setSalvando(true);
    const json = await enviar('/api/admin/agenda', 'PUT', form);
    setSalvando(false);
    if (json) abrirAlerta?.('Agenda salva', 'Os clientes já veem os novos dias e horários.', () => {}, 'sucesso');
  };

  const alternarDia = (d) =>
    setForm((f) => ({ ...f, dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter((x) => x !== d) : [...f.dias_semana, d] }));

  const adicionarHorario = () => {
    if (!/^\d{2}:\d{2}$/.test(novoHorario)) return;
    setForm((f) => ({ ...f, horarios: [...new Set([...f.horarios, novoHorario])].sort() }));
    setNovoHorario('');
  };

  const fecharDia = async () => {
    if (!novoBloqueio.data) return;
    const json = await enviar('/api/admin/agenda/bloqueios', 'POST', novoBloqueio);
    if (!json) return;
    setNovoBloqueio({ data: '', motivo: '' });
    if (json.agendados_no_dia > 0) {
      abrirAlerta?.(
        'Dia fechado',
        `Já existem ${json.agendados_no_dia} carro(s) agendado(s) em ${dataBR(novoBloqueio.data)}. Eles não foram cancelados: avise os clientes e cancele pelo pátio se precisar.`,
        () => {},
        'info'
      );
    }
  };

  if (!form) {
    return <div className="mx-auto max-w-5xl space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-tinta-100" />)}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CabecalhoPagina titulo="Agenda" subtitulo="Dias e horários em que o cliente pode agendar, quantos carros cabem em cada horário e os dias fechados.">
        <button onClick={salvar} disabled={salvando} className="fw-btn-primario"><Save size={17} /> {salvando ? 'Salvando...' : 'Salvar agenda'}</button>
      </CabecalhoPagina>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Dias de atendimento" icone={CalendarDays}>
          <div className="grid grid-cols-7 gap-1.5">
            {DIAS.map((nome, d) => {
              const aberto = form.dias_semana.includes(d);
              return (
                <button key={nome} type="button" onClick={() => alternarDia(d)} aria-pressed={aberto}
                  className={`h-11 rounded-xl text-sm font-semibold transition-colors ${aberto ? 'bg-marca-600 text-white' : 'bg-tinta-100 text-tinta-500 hover:bg-tinta-200'}`}>
                  {nome}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-tinta-500">Dias em azul abrem para agendamento.</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <label className="fw-label">
              Vagas por horário
              <input type="number" min={1} max={50} className="fw-input mt-1" value={form.capacidade_por_horario}
                onChange={(e) => setForm((f) => ({ ...f, capacidade_por_horario: Number(e.target.value) }))} />
            </label>
            <label className="fw-label">
              Cancelar pelo app até
              <span className="relative mt-1 block">
                <input type="number" min={0} max={72} className="fw-input pr-16" value={form.antecedencia_cancelamento_horas}
                  onChange={(e) => setForm((f) => ({ ...f, antecedencia_cancelamento_horas: Number(e.target.value) }))} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tinta-400">h antes</span>
              </span>
            </label>
          </div>
        </Secao>

        <Secao titulo="Horários de início" icone={Clock}>
          <div className="flex flex-wrap gap-2">
            {form.horarios.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 rounded-full bg-tinta-100 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-tinta-800">
                {h}
                <button type="button" onClick={() => setForm((f) => ({ ...f, horarios: f.horarios.filter((x) => x !== h) }))}
                  className="grid size-6 place-items-center rounded-full text-tinta-400 hover:bg-white hover:text-red-600" aria-label={`Remover ${h}`}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input type="time" step={900} className="fw-input h-10 max-w-36" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} />
            <button type="button" onClick={adicionarHorario} disabled={!novoHorario} className="fw-btn-contorno h-10"><Plus size={16} /> Adicionar</button>
          </div>
          <p className="mt-3 text-xs text-tinta-500">Deixe de fora o horário de almoço. Agendamentos já feitos não mudam.</p>
        </Secao>
      </div>

      <Secao titulo="Dias fechados" subtitulo="Feriados, manutenção ou folga. O cliente não consegue agendar nesses dias." icone={CalendarOff}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-tinta-500">
            Data
            <input type="date" className="fw-input mt-1 h-10" value={novoBloqueio.data} onChange={(e) => setNovoBloqueio((b) => ({ ...b, data: e.target.value }))} />
          </label>
          <label className="min-w-48 flex-1 text-xs font-semibold text-tinta-500 sm:max-w-xs">
            Motivo (o cliente vê)
            <input className="fw-input mt-1 h-10" placeholder="Ex.: Natal" maxLength={100} value={novoBloqueio.motivo}
              onChange={(e) => setNovoBloqueio((b) => ({ ...b, motivo: e.target.value }))} />
          </label>
          <button type="button" onClick={fecharDia} disabled={!novoBloqueio.data} className="fw-btn-contorno h-10"><CalendarOff size={16} /> Fechar dia</button>
        </div>

        {bloqueios.length === 0 ? (
          <p className="mt-4 text-sm text-tinta-500">Nenhum dia fechado pela frente.</p>
        ) : (
          <ul className="mt-4 divide-y divide-tinta-100 rounded-xl ring-1 ring-tinta-200">
            {bloqueios.map((b) => (
              <li key={b.data} className="flex items-center justify-between gap-3 px-4 py-3">
                <span><strong className="text-tinta-900">{dataBR(b.data)}</strong>{b.motivo && <span className="text-tinta-500"> · {b.motivo}</span>}</span>
                <button type="button" onClick={() => enviar(`/api/admin/agenda/bloqueios/${b.data}`, 'DELETE')} className="fw-btn-perigo" title="Reabrir o dia" aria-label="Reabrir o dia">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
