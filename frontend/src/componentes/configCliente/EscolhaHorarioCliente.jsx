import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Edit3, Check, Car } from 'lucide-react';
import { apiFetch, API_URL } from '../../utils/api';
import { formatarMoeda } from '../../utils/precos';

// Data de hoje no fuso do navegador (toISOString usaria UTC e, à noite, já mostraria o dia seguinte)
const hojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// AAAA-MM-DD -> DD/MM/AAAA
const formatarDataBr = (dataIso) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
};

const enderecoLavaRapido = "Av. Principal do Lavacar, 1000 - Centro, Osasco - SP";

// Passo 4 do agendamento: data, horário, endereço (no leva e traz), resumo e confirmação.
// Cada horário comporta um número limitado de carros; se o horário escolhido não tiver vaga
// para todos, os demais ocupam os próximos horários do dia (o backend decide e devolve).
export default function EscolhaHorarioCliente({ resumo, tipoLogistica, levaTras, aoConcluir, aoVoltar, aoCancelar }) {
    const hoje = hojeLocal();
    const ehLevaTras = tipoLogistica === 'leva_tras';
    const taxaCentavos = ehLevaTras ? Math.round(Number(levaTras?.taxa_por_veiculo || 0) * 100) : 0;
    const totalCentavos = resumo.reduce((acc, item) => acc + item.subtotalCentavos + taxaCentavos, 0);

    const [data, setData] = useState(hoje);
    const [horarios, setHorarios] = useState([]);
    const [horario, setHorario] = useState(null);
    const [carregandoHorarios, setCarregandoHorarios] = useState(false);

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);
    const [sugestao, setSugestao] = useState(null);
    const [confirmado, setConfirmado] = useState(null);

    // Estados para o endereço e edição
    const [enderecoCliente, setEnderecoCliente] = useState('');
    const [editandoEndereco, setEditandoEndereco] = useState(false);
    const [novoEndereco, setNovoEndereco] = useState('');
    const [salvandoEndereco, setSalvandoEndereco] = useState(false);

    // Endereço do próprio cliente (só no leva e traz)
    useEffect(() => {
        if (!ehLevaTras) return;
        const buscarEndereco = async () => {
            try {
                const resposta = await apiFetch(`${API_URL}/api/me`);
                if (resposta.ok) {
                    const cliente = await resposta.json();
                    setEnderecoCliente(cliente.endereco || '');
                    setNovoEndereco(cliente.endereco || '');
                    if (!cliente.endereco) setEditandoEndereco(true);
                }
            } catch (err) {
                console.error('Erro ao buscar endereço:', err);
            }
        };
        buscarEndereco();
    }, [ehLevaTras]);

    // Vagas do dia escolhido
    useEffect(() => {
        if (!data) return;
        let cancelado = false;
        const buscarHorarios = async () => {
            setCarregandoHorarios(true);
            try {
                const resposta = await apiFetch(`${API_URL}/api/agendamentos/horarios?data=${data}`);
                const json = await resposta.json();
                if (cancelado) return;
                if (resposta.ok) {
                    setHorarios(json.horarios);
                    // Mantém o horário escolhido se ainda tiver vaga; senão, pega o primeiro livre
                    setHorario(atual => {
                        const ainda = json.horarios.find(h => h.horario === atual && h.vagas > 0);
                        return ainda ? atual : (json.horarios.find(h => h.vagas > 0)?.horario ?? null);
                    });
                } else {
                    setHorarios([]);
                    setErro(json.erro || 'Erro ao buscar os horários.');
                }
            } catch {
                if (!cancelado) setErro('Falha de conexão ao buscar os horários.');
            } finally {
                if (!cancelado) setCarregandoHorarios(false);
            }
        };
        buscarHorarios();
        return () => { cancelado = true; };
    }, [data]);

    const salvarNovoEndereco = async () => {
        if (!novoEndereco.trim()) return;
        setSalvandoEndereco(true);
        try {
            const resposta = await apiFetch(`${API_URL}/api/me/endereco`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endereco: novoEndereco })
            });
            const json = await resposta.json();
            if (resposta.ok) {
                setEnderecoCliente(json.endereco);
                setEditandoEndereco(false);
            } else {
                alert(json.erro || 'Erro ao atualizar o endereço.');
            }
        } catch (err) {
            console.error(err);
            alert('Falha de conexão ao salvar endereço.');
        } finally {
            setSalvandoEndereco(false);
        }
    };

    const lidarComFinalizacao = async () => {
        setErro(null);
        setSugestao(null);

        if (!horario) {
            setErro('Escolha um horário.');
            return;
        }
        if (ehLevaTras && !enderecoCliente) {
            setErro('Informe o endereço de busca do veículo.');
            return;
        }

        setCarregando(true);
        try {
            const resposta = await apiFetch(`${API_URL}/api/agendamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    horario,
                    tipo_logistica: tipoLogistica,
                    veiculos: resumo.map(item => ({
                        veiculo_id: item.veiculo.id,
                        pacote_id: item.pacote.id,
                        extras: item.extras.map(e => e.id)
                    }))
                })
            });
            const json = await resposta.json();

            if (resposta.ok) {
                setConfirmado(json);
            } else {
                setErro(json.erro || 'Erro ao registrar o agendamento.');
                if (json.sugestao) setSugestao(json.sugestao);
            }
        } catch (err) {
            console.error(err);
            setErro('Erro de conexão ao finalizar o agendamento.');
        } finally {
            setCarregando(false);
        }
    };

    const aceitarSugestao = () => {
        setErro(null);
        setHorario(sugestao.horario);
        setData(sugestao.data);
        setSugestao(null);
    };

    const nomeVeiculo = (veiculoId) => {
        const item = resumo.find(i => i.veiculo.id === veiculoId);
        return item ? `${item.veiculo.marca} ${item.veiculo.modelo}` : `Veículo #${veiculoId}`;
    };

    const caixa = { backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' };
    const rotulo = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' };

    // ---------- Tela de sucesso ----------
    if (confirmado) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '50%', padding: '0.4rem', display: 'flex' }}><Check size={20} /></div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Agendamento confirmado!</h2>
                    </div>
                    <div style={caixa}>
                        {confirmado.veiculos.map(v => (
                            <div key={v.execucao_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.9rem' }}>
                                <span><strong>{nomeVeiculo(v.veiculo_id)}</strong> • {formatarDataBr(v.data)} às {v.horario}</span>
                                <span>{formatarMoeda(Math.round(Number(v.valor_total) * 100))}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: '800' }}>
                            <span>Total</span>
                            <span>{formatarMoeda(Math.round(Number(confirmado.valor_total) * 100))}</span>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                        {ehLevaTras
                            ? `Vamos buscar o(s) veículo(s) em: ${enderecoCliente}`
                            : `Leve o(s) veículo(s) até ${enderecoLavaRapido} no horário marcado.`}
                    </p>
                    <button onClick={aoConcluir} style={{ alignSelf: 'flex-end', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', color: '#ffffff', backgroundColor: '#0f172a', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>

                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                            Data, Horário e Resumo
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600' }}>
                            Passo 4 de 4 • {resumo.length} veículo(s) • {ehLevaTras ? 'Leva e traz' : 'Eu levo o carro'}
                        </span>
                    </div>
                    <button onClick={aoCancelar} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                        &times;
                    </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                    {erro && (
                        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                            {erro}
                            {sugestao && (
                                <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', color: '#0f172a' }}>
                                    <span>Próximo horário com vaga para todos: <strong>{formatarDataBr(sugestao.data)} às {sugestao.horario}</strong></span>
                                    <button onClick={aceitarSugestao} style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Usar esse horário
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Local */}
                    <div style={caixa}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={rotulo}>
                                <MapPin size={14} color="#2563eb" />
                                {ehLevaTras ? 'Endereço de busca (leva e traz)' : 'Local de Atendimento'}
                            </span>

                            {ehLevaTras && !editandoEndereco && (
                                <button onClick={() => setEditandoEndereco(true)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Edit3 size={13} /> Alterar endereço
                                </button>
                            )}
                        </div>

                        {!ehLevaTras ? (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                                {enderecoLavaRapido} <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>(Leve o seu veículo até ao pátio no horário agendado)</span>
                            </p>
                        ) : !editandoEndereco ? (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>{enderecoCliente}</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={novoEndereco}
                                    maxLength={255}
                                    onChange={(e) => setNovoEndereco(e.target.value)}
                                    placeholder="Rua, número, bairro e cidade"
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                                <button onClick={salvandoEndereco ? null : salvarNovoEndereco} disabled={!novoEndereco.trim()} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Check size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Data */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={rotulo}><Calendar size={14} /> Data do Atendimento</label>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#2563eb' }}>Selecionada: {formatarDataBr(data)}</span>
                        </div>
                        <input
                            type="date"
                            min={hoje}
                            value={data}
                            onChange={(e) => { setErro(null); setSugestao(null); setData(e.target.value); }}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Horários com vagas */}
                    <div>
                        <label style={{ ...rotulo, marginBottom: '0.5rem' }}><Clock size={14} /> Horário de início</label>
                        {carregandoHorarios ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Buscando vagas...</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {horarios.map((h) => {
                                    const selecionado = horario === h.horario;
                                    const livre = h.vagas > 0;
                                    return (
                                        <button
                                            key={h.horario}
                                            type="button"
                                            disabled={!livre}
                                            onClick={() => { setErro(null); setSugestao(null); setHorario(h.horario); }}
                                            style={{
                                                padding: '0.55rem', borderRadius: '8px', border: '1px solid', fontWeight: '600', fontSize: '0.9rem',
                                                cursor: livre ? 'pointer' : 'not-allowed',
                                                backgroundColor: selecionado ? '#eff6ff' : livre ? '#ffffff' : '#f1f5f9',
                                                borderColor: selecionado ? '#3b82f6' : '#e2e8f0',
                                                color: selecionado ? '#1e40af' : livre ? '#475569' : '#94a3b8',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {h.horario}
                                            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '500' }}>
                                                {h.passado ? 'Encerrado' : livre ? `${h.vagas} vaga(s)` : 'Lotado'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {resumo.length > 1 && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                Se o horário escolhido não tiver vaga para todos os carros, os demais ficam nos próximos horários do dia.
                            </p>
                        )}
                    </div>

                    {/* Resumo do pedido */}
                    <div style={caixa}>
                        <span style={{ ...rotulo, marginBottom: '0.5rem' }}>Resumo</span>
                        {resumo.map((item) => (
                            <div key={item.veiculo.id} style={{ padding: '0.5rem 0', borderBottom: '1px dashed #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Car size={15} color="#2563eb" />
                                        <strong>{item.veiculo.marca} {item.veiculo.modelo}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(porte {item.veiculo.porte})</span>
                                    </span>
                                    <strong>{formatarMoeda(item.subtotalCentavos + taxaCentavos)}</strong>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                                    {item.pacote?.nome}
                                    {item.extras.length > 0 && ` + ${item.extras.map(e => e.nome).join(', ')}`}
                                    {ehLevaTras && ` + leva e traz ${formatarMoeda(taxaCentavos)}`}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.6rem', fontWeight: '800', fontSize: '1rem' }}>
                            <span>Total</span>
                            <span>{formatarMoeda(totalCentavos)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.0rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={aoVoltar} disabled={carregando} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Voltar
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={aoCancelar} disabled={carregando} style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: '600', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            Cancelar
                        </button>
                        <button onClick={lidarComFinalizacao} disabled={carregando || !horario} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', color: '#ffffff', backgroundColor: horario ? '#0f172a' : '#cbd5e1', cursor: horario ? 'pointer' : 'not-allowed', border: 'none', fontSize: '0.85rem', opacity: carregando ? 0.7 : 1 }}>
                            {carregando ? 'A confirmar...' : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
