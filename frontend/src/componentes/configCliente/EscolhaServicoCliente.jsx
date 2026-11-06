import React, { useState, useEffect } from 'react';
import { Car, Check } from 'lucide-react';
import { apiFetch, API_URL } from "../../utils/api";
import { precoCentavos, formatarMoeda } from '../../utils/precos';

// Passo 2 do agendamento: para CADA veículo escolhido, o cliente marca 1 serviço (pacote)
// e quantos extras quiser. O preço de cada item segue o porte daquele veículo.
// `selecoes` = { [veiculoId]: { pacoteId, extraIds: [] } }
// aoAvancar(selecoes, resumo) -> resumo = [{ veiculo, pacote, extras, subtotalCentavos }]
export default function EscolhaServicoCliente({ veiculos, selecoesIniciais = {}, aoAvancar, aoVoltar, aoCancelar }) {
    const [pacotes, setPacotes] = useState([]);
    const [extras, setExtras] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [selecoes, setSelecoes] = useState(() => {
        const inicial = {};
        veiculos.forEach((v) => {
            inicial[v.id] = selecoesIniciais[v.id] || { pacoteId: null, extraIds: [] };
        });
        return inicial;
    });

    useEffect(() => {
        async function carregarCatalogo() {
            try {
                const [resPacotes, resExtras] = await Promise.all([
                    apiFetch(`${API_URL}/api/pacotes`),
                    apiFetch(`${API_URL}/api/extras`)
                ]);
                if (!resPacotes.ok || !resExtras.ok) {
                    setErro('Erro ao carregar os serviços.');
                    return;
                }
                setPacotes(await resPacotes.json());
                setExtras(await resExtras.json());
            } catch {
                setErro('Falha de conexão com o servidor.');
            } finally {
                setCarregando(false);
            }
        }
        carregarCatalogo();
    }, []);

    const escolherPacote = (veiculoId, pacoteId) => {
        setSelecoes(prev => ({ ...prev, [veiculoId]: { ...prev[veiculoId], pacoteId } }));
    };

    const alternarExtra = (veiculoId, extraId) => {
        setSelecoes(prev => {
            const atuais = prev[veiculoId].extraIds;
            const extraIds = atuais.includes(extraId) ? atuais.filter(id => id !== extraId) : [...atuais, extraId];
            return { ...prev, [veiculoId]: { ...prev[veiculoId], extraIds } };
        });
    };

    const subtotalCentavos = (veiculo) => {
        const selecao = selecoes[veiculo.id];
        const pacote = pacotes.find(p => p.id === selecao.pacoteId);
        const somaExtras = selecao.extraIds.reduce(
            (acc, id) => acc + precoCentavos(extras.find(e => e.id === id), veiculo.porte), 0
        );
        return precoCentavos(pacote, veiculo.porte) + somaExtras;
    };

    const totalCentavos = veiculos.reduce((acc, v) => acc + subtotalCentavos(v), 0);

    // Resumo usado nos próximos passos: o que foi escolhido para cada carro, já com os nomes
    const montarResumo = () => veiculos.map((veiculo) => ({
        veiculo,
        pacote: pacotes.find(p => p.id === selecoes[veiculo.id].pacoteId),
        extras: extras.filter(e => selecoes[veiculo.id].extraIds.includes(e.id)),
        subtotalCentavos: subtotalCentavos(veiculo)
    }));
    const todosComServico = veiculos.every(v => selecoes[v.id].pacoteId !== null);

    const estiloOpcao = (ativo) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer', border: '1px solid',
        backgroundColor: ativo ? '#eff6ff' : '#ffffff',
        borderColor: ativo ? '#3b82f6' : '#e2e8f0',
        transition: 'all 0.2s'
    });

    const marcador = (ativo, redondo) => (
        <div style={{
            width: '20px', height: '20px', flexShrink: 0, borderRadius: redondo ? '50%' : '5px', border: '2px solid',
            borderColor: ativo ? '#2563eb' : '#cbd5e1', backgroundColor: ativo ? '#2563eb' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
        }}>
            {ativo && <Check size={12} strokeWidth={3} />}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '700px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Cabeçalho */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                            Serviços de cada veículo
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600' }}>
                            Passo 2 de 4 • O preço segue o porte de cada carro
                        </span>
                    </div>
                    <button onClick={aoCancelar} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                        &times;
                    </button>
                </div>

                {/* Conteúdo */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {carregando && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Buscando os serviços disponíveis...</p>
                    )}

                    {erro && (
                        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
                            {erro}
                        </div>
                    )}

                    {!carregando && !erro && pacotes.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Nenhum serviço disponível no momento.</p>
                    )}

                    {!carregando && !erro && pacotes.length > 0 && veiculos.map((veiculo) => {
                        const selecao = selecoes[veiculo.id];
                        return (
                            <div key={veiculo.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                {/* Veículo */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: '#f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Car size={18} color="#2563eb" />
                                        <strong style={{ color: '#0f172a' }}>{veiculo.marca} {veiculo.modelo}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>{veiculo.placa}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', backgroundColor: '#dbeafe', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                                        Porte {veiculo.porte}
                                    </span>
                                </div>

                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Serviço (escolha 1)</span>
                                    {pacotes.map((pacote) => {
                                        const ativo = selecao.pacoteId === pacote.id;
                                        return (
                                            <div key={pacote.id} onClick={() => escolherPacote(veiculo.id, pacote.id)} style={estiloOpcao(ativo)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {marcador(ativo, true)}
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{pacote.nome}</div>
                                                        {pacote.descricao && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{pacote.descricao}</div>}
                                                    </div>
                                                </div>
                                                <span style={{ fontWeight: '700', color: '#15803d', whiteSpace: 'nowrap' }}>
                                                    {formatarMoeda(precoCentavos(pacote, veiculo.porte))}
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {extras.length > 0 && (
                                        <>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: '0.5rem' }}>Extras (opcional)</span>
                                            {extras.map((extra) => {
                                                const ativo = selecao.extraIds.includes(extra.id);
                                                return (
                                                    <div key={extra.id} onClick={() => alternarExtra(veiculo.id, extra.id)} style={estiloOpcao(ativo)}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            {marcador(ativo, false)}
                                                            <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '0.9rem' }}>{extra.nome}</div>
                                                        </div>
                                                        <span style={{ fontWeight: '600', color: '#15803d', whiteSpace: 'nowrap' }}>
                                                            + {formatarMoeda(precoCentavos(extra, veiculo.porte))}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>

                                {/* Subtotal do veículo */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#475569' }}>
                                        {selecao.pacoteId === null ? 'Escolha um serviço para este carro' : 'Subtotal deste carro'}
                                    </span>
                                    <strong style={{ color: '#0f172a' }}>{formatarMoeda(subtotalCentavos(veiculo))}</strong>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Rodapé com total geral */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={aoVoltar} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Voltar
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total ({veiculos.length} veículo(s))</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{formatarMoeda(totalCentavos)}</div>
                        </div>
                        <button
                            disabled={!todosComServico}
                            onClick={() => aoAvancar(selecoes, montarResumo())}
                            style={{
                                padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', color: '#ffffff', border: 'none', fontSize: '0.85rem',
                                backgroundColor: todosComServico ? '#0f172a' : '#cbd5e1',
                                cursor: todosComServico ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Próximo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
