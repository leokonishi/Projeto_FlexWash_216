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

const rotulo = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: compacto ? '0.6rem' : '1.25rem' }}>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={rotulo}><Calendar size={14} /> Data do Atendimento</label>
                    {!compacto && <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#2563eb' }}>Selecionada: {formatarDataBr(data)}</span>}
                </div>
                <input
                    type="date"
                    min={hoje}
                    value={data}
                    onChange={(e) => onChange({ data: e.target.value, horario })}
                    style={{ width: '100%', padding: compacto ? '0.55rem' : '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                />
            </div>

            <div>
                {!compacto && <label style={{ ...rotulo, marginBottom: '0.5rem' }}><Clock size={14} /> Horário de início</label>}
                {erro && <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626' }}>{erro}</p>}
                {carregando ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Buscando vagas...</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compacto ? 5 : 3}, 1fr)`, gap: '0.4rem' }}>
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
                                    style={{
                                        padding: compacto ? '0.4rem 0.2rem' : '0.55rem', borderRadius: '8px', border: '1px solid', fontWeight: '600',
                                        fontSize: compacto ? '0.8rem' : '0.9rem',
                                        cursor: livre ? 'pointer' : 'not-allowed',
                                        backgroundColor: selecionado ? '#eff6ff' : livre ? '#ffffff' : '#f1f5f9',
                                        borderColor: selecionado ? '#3b82f6' : '#e2e8f0',
                                        color: selecionado ? '#1e40af' : livre ? '#475569' : '#94a3b8',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {h.horario}
                                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '500' }}>
                                        {h.passado ? 'Encerrado' : selecionado ? 'Escolhido' : livres > 0 ? `${livres} vaga(s)` : 'Lotado'}
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
