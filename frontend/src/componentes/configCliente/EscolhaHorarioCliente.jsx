import React, { useState } from 'react';
import { MapPin, Car } from 'lucide-react';
import { apiFetch, API_URL } from '../../utils/api';
import { formatarMoeda } from '../../utils/precos';
import SeletorDataHorario, { hojeLocal, formatarDataBr } from './SeletorDataHorario';

// Passo 4 do agendamento: data, horário, endereço, resumo e confirmação.
// No leva e traz, `levaTras` é a avaliação feita no passo 3 (endereço de busca,
// distância e valor por veículo); o backend confere o raio de novo ao confirmar.
// Com mais de um carro, o cliente escolhe entre:
//  - todos no mesmo horário: se o horário não tiver vaga para todos, os demais ocupam os
//    próximos horários do dia (o backend decide e devolve);
//  - um horário para cada carro: cada um com a sua data e hora (horario_por_veiculo).
export default function EscolhaHorarioCliente({ resumo, tipoLogistica, levaTras, enderecoLavaRapido, aoConcluir, aoVoltar, aoCancelar }) {
    const hoje = hojeLocal();
    const ehLevaTras = tipoLogistica === 'leva_tras';
    const taxaCentavos = ehLevaTras ? Math.round(Number(levaTras?.taxa_por_veiculo || 0) * 100) : 0;
    const totalCentavos = resumo.reduce((acc, item) => acc + item.subtotalCentavos + taxaCentavos, 0);

    const [data, setData] = useState(hoje);
    const [horario, setHorario] = useState(null);
    const [porVeiculo, setPorVeiculo] = useState(false);
    // { [veiculoId]: { data, horario } } — usado só no modo "um horário para cada carro"
    const [horariosVeiculos, setHorariosVeiculos] = useState({});

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);
    const [sugestao, setSugestao] = useState(null);
    const [confirmado, setConfirmado] = useState(null);

    const enderecoCliente = levaTras?.endereco_cliente || '';
    const localLavaRapido = enderecoLavaRapido || 'nosso lava-rápido';

    const limparAvisos = () => { setErro(null); setSugestao(null); };

    const mudarGeral = ({ data: novaData, horario: novoHorario }) => {
        limparAvisos();
        setData(novaData);
        setHorario(novoHorario);
    };

    const mudarVeiculo = (veiculoId) => ({ data: novaData, horario: novoHorario }) => {
        limparAvisos();
        setHorariosVeiculos(atual => ({ ...atual, [veiculoId]: { data: novaData, horario: novoHorario } }));
    };

    const alternarModo = (individual) => {
        limparAvisos();
        if (individual) {
            // Começa com todos na data/horário que já estavam escolhidos
            const inicial = {};
            resumo.forEach(item => { inicial[item.veiculo.id] = horariosVeiculos[item.veiculo.id] || { data, horario }; });
            setHorariosVeiculos(inicial);
        }
        setPorVeiculo(individual);
    };

    // Vagas que os OUTROS carros deste pedido já pegaram na mesma data (modo individual)
    const ocupadosPorOutros = (veiculoId) => {
        const meu = horariosVeiculos[veiculoId];
        const mapa = new Map();
        resumo.forEach(item => {
            const outro = horariosVeiculos[item.veiculo.id];
            if (item.veiculo.id === veiculoId || !outro?.horario || outro.data !== meu?.data) return;
            mapa.set(outro.horario, (mapa.get(outro.horario) || 0) + 1);
        });
        return mapa;
    };

    const tudoEscolhido = porVeiculo
        ? resumo.every(item => horariosVeiculos[item.veiculo.id]?.horario)
        : Boolean(horario);

    const lidarComFinalizacao = async () => {
        setErro(null);
        setSugestao(null);

        if (!tudoEscolhido) {
            setErro(porVeiculo ? 'Escolha um horário para cada carro.' : 'Escolha um horário.');
            return;
        }
        if (ehLevaTras && !enderecoCliente) {
            setErro('Volte ao passo anterior e informe o endereço de busca do veículo.');
            return;
        }

        setCarregando(true);
        try {
            const resposta = await apiFetch(`${API_URL}/api/agendamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(porVeiculo ? { horario_por_veiculo: true } : { data, horario }),
                    tipo_logistica: tipoLogistica,
                    veiculos: resumo.map(item => ({
                        veiculo_id: item.veiculo.id,
                        pacote_id: item.pacote.id,
                        extras: item.extras.map(e => e.id),
                        ...(porVeiculo ? horariosVeiculos[item.veiculo.id] : {})
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
        setPorVeiculo(false);
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
                            : `Leve o(s) veículo(s) até ${localLavaRapido} no horário marcado.`}
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

                        </div>

                        {!ehLevaTras ? (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                                {localLavaRapido} <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>(Leve o seu veículo até ao pátio no horário agendado)</span>
                            </p>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                                {enderecoCliente}
                                {levaTras?.distancia_km != null && (
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                        {Number(levaTras.distancia_km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km do lava-rápido (para trocar o endereço, volte ao passo anterior)
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Mesmo horário x um horário por carro */}
                    {resumo.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[[false, 'Todos no mesmo horário'], [true, 'Um horário para cada carro']].map(([individual, texto]) => (
                                <button
                                    key={texto}
                                    type="button"
                                    onClick={() => alternarModo(individual)}
                                    style={{
                                        flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                                        backgroundColor: porVeiculo === individual ? '#eff6ff' : '#ffffff',
                                        borderColor: porVeiculo === individual ? '#3b82f6' : '#e2e8f0',
                                        color: porVeiculo === individual ? '#1e40af' : '#475569'
                                    }}
                                >
                                    {texto}
                                </button>
                            ))}
                        </div>
                    )}

                    {!porVeiculo ? (
                        <div>
                            <SeletorDataHorario data={data} horario={horario} onChange={mudarGeral} />
                            {resumo.length > 1 && (
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Se o horário escolhido não tiver vaga para todos os carros, os demais ficam nos próximos horários do dia.
                                </p>
                            )}
                        </div>
                    ) : (
                        resumo.map(item => {
                            const escolha = horariosVeiculos[item.veiculo.id] || { data, horario: null };
                            return (
                                <div key={item.veiculo.id} style={caixa}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Car size={15} color="#2563eb" />
                                            <strong>{item.veiculo.marca} {item.veiculo.modelo}</strong>
                                        </span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: escolha.horario ? '#2563eb' : '#dc2626' }}>
                                            {escolha.horario ? `${formatarDataBr(escolha.data)} às ${escolha.horario}` : 'Escolha um horário'}
                                        </span>
                                    </div>
                                    <SeletorDataHorario
                                        compacto
                                        data={escolha.data}
                                        horario={escolha.horario}
                                        onChange={mudarVeiculo(item.veiculo.id)}
                                        ocupadosNoPedido={ocupadosPorOutros(item.veiculo.id)}
                                    />
                                </div>
                            );
                        })
                    )}

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
                        <button onClick={lidarComFinalizacao} disabled={carregando || !tudoEscolhido} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', color: '#ffffff', backgroundColor: tudoEscolhido ? '#0f172a' : '#cbd5e1', cursor: tudoEscolhido ? 'pointer' : 'not-allowed', border: 'none', fontSize: '0.85rem', opacity: carregando ? 0.7 : 1 }}>
                            {carregando ? 'A confirmar...' : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
