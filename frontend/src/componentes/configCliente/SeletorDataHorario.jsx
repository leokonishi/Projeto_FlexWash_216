import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { apiFetch, API_URL } from '../../utils/api';

// Data de hoje no fuso do navegador (toISOString usaria UTC e, à noite, já mostraria o dia seguinte)
export const hojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// AAAA-MM-DD -> DD/MM/AAAA
export const formatarDataBr = (dataIso) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
};

// Data + grade de horários com as vagas de GET /api/agendamentos/horarios.
// `ocupadosNoPedido` (Map 'HH:MM' -> n) desconta as vagas que outros carros deste mesmo
// agendamento já escolheram nessa data.
// onChange({ data, horario }) — ao trocar a data, mantém o horário se ainda houver vaga,
// senão escolhe o primeiro livre (ou null).
export default function SeletorDataHorario({ data, horario, onChange, ocupadosNoPedido, compacto = false }) {
    const hoje = hojeLocal();
    const [horarios, setHorarios] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    const vagasLivres = (h) => (h.vagas || 0) - (ocupadosNoPedido?.get(h.horario) || 0);

    useEffect(() => {
        if (!data) return;
        let cancelado = false;
        const buscarHorarios = async () => {
            setCarregando(true);
            setErro(null);
            try {
                const resposta = await apiFetch(`${API_URL}/api/agendamentos/horarios?data=${data}`);
                const json = await resposta.json();
                if (cancelado) return;
                if (resposta.ok) {
                    setHorarios(json.horarios);
                    // Mantém o horário já escolhido enquanto o dia tiver vaga nele (se outro carro do
                    // pedido disputar a mesma vaga, o servidor avisa ao confirmar); senão, o primeiro livre
                    const ainda = json.horarios.find(h => h.horario === horario && h.vagas > 0);
                    if (!ainda) onChange({ data, horario: json.horarios.find(h => vagasLivres(h) > 0)?.horario ?? null });
                } else {
                    setHorarios([]);
                    setErro(json.erro || 'Erro ao buscar os horários.');
                }
            } catch {
                if (!cancelado) setErro('Falha de conexão ao buscar os horários.');
            } finally {
                if (!cancelado) setCarregando(false);
            }
        };
        buscarHorarios();
        return () => { cancelado = true; };
        // Só a data dispara a busca; horário e vagas do pedido mudam sem precisar ir ao servidor
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    return (
        <div className={compacto ? 'space-y-3' : 'space-y-5'}>
            <div>
                <label className="fw-rotulo-secao mb-2 flex items-center gap-1.5"><Calendar size={13} /> Data</label>
                <input
                    type="date"
                    min={hoje}
                    value={data}
                    onChange={(e) => onChange({ data: e.target.value, horario })}
                    className="fw-input"
                />
            </div>

            <div>
                {!compacto && <label className="fw-rotulo-secao mb-2 flex items-center gap-1.5"><Clock size={13} /> Horário de início</label>}
                {erro && <p className="text-sm text-red-600">{erro}</p>}
                {carregando ? (
                    <div className={`grid gap-2 ${compacto ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4'}`}>
                        {Array.from({ length: compacto ? 5 : 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-tinta-100" />)}
                    </div>
                ) : (
                    <div className={`grid gap-2 ${compacto ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4'}`}>
                        {horarios.map((h) => {
                            const selecionado = horario === h.horario;
                            const livres = vagasLivres(h);
                            const livre = selecionado || livres > 0;
                            return (
                                <button
                                    key={h.horario}
                                    type="button"
                                    disabled={!livre}
                                    onClick={() => onChange({ data, horario: h.horario })}
                                    className={`flex flex-col items-center justify-center rounded-xl border py-2 transition-all ${
                                        selecionado
                                            ? 'border-marca-600 bg-marca-600 text-white shadow-md shadow-marca-600/25'
                                            : livre
                                                ? 'border-tinta-200 bg-white text-tinta-800 hover:border-marca-300 hover:bg-marca-50'
                                                : 'cursor-not-allowed border-tinta-100 bg-tinta-50 text-tinta-300'
                                    }`}
                                >
                                    <span className={`font-semibold ${compacto ? 'text-sm' : 'text-[15px]'}`}>{h.horario}</span>
                                    <span className={`text-[11px] ${selecionado ? 'text-marca-100' : livre ? (livres === 1 ? 'text-ouro-600' : 'text-verde-600') : ''}`}>
                                        {h.passado ? 'Encerrado' : selecionado ? 'Escolhido' : livres > 0 ? `${livres} ${livres === 1 ? 'vaga' : 'vagas'}` : 'Lotado'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
