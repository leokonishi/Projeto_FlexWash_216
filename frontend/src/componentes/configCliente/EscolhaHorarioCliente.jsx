import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Edit3, Check } from 'lucide-react';
import { apiFetch, API_URL } from '../../utils/api';

export default function EscolhaHorarioCliente({ dadosAgendamento, aoConcluir, aoVoltar, aoCancelar }) {
    const hoje = new Date().toISOString().split('T')[0];
    
    const [data, setData] = useState(hoje);
    const [horario, setHorario] = useState('08:00');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    // Estados para o endereço e edição
    const [enderecoCliente, setEnderecoCliente] = useState('Carregando endereço...');
    const [editandoEndereco, setEditandoEndereco] = useState(false);
    const [novoEndereco, setNovoEndereco] = useState('');
    const [salvandoEndereco, setSalvandoEndereco] = useState(false);

    const horariosDisponiveis = [
        '08:00', '09:00', '10:00', '11:00', 
        '13:00', '14:00', '15:00', '16:00', '17:00'
    ];

    const enderecoLavaRapido = "Av. Principal do Lavacar, 1000 - Centro, Osasco - SP";

    // Formata a data de AAAA-MM-DD para DD/MM/AAAA para exibição amigável
    const formatarDataBr = (dataIso) => {
        if (!dataIso) return '';
        const [ano, mes, dia] = dataIso.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // Busca o endereço decodificando diretamente do token ou listando
    useEffect(() => {
        const buscarEndereco = async () => {
            try {
                const token = localStorage.getItem('token_flexwash');
                if (!token) return;

                const payloadToken = JSON.parse(atob(token.split('.')[1]));
                const idBruto = String(payloadToken.id || payloadToken.clienteId || '');
                const clienteId = idBruto.split(':')[0];

                if (!clienteId) return;

                const resposta = await fetch(`${API_URL}/api/clientes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (resposta.ok) {
                    const listaClientes = await resposta.json();
                    const clienteLogado = listaClientes.find(c => String(c.id) === String(clienteId));

                    if (clienteLogado && clienteLogado.endereco) {
                        setEnderecoCliente(clienteLogado.endereco);
                        setNovoEndereco(clienteLogado.endereco);
                    } else {
                        setEnderecoCliente('Endereço não cadastrado. Clique em "Alterar endereço".');
                        setNovoEndereco('');
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar endereço:', err);
                setEnderecoCliente('Endereço não cadastrado.');
            }
        };

        if (dadosAgendamento.levaTras === 'leva_tras') {
            buscarEndereco();
        }
    }, [dadosAgendamento.levaTras, API_URL]);

    const salvarNovoEndereco = async () => {
        if (!novoEndereco.trim()) return;
        setSalvandoEndereco(true);

        try {
            const token = localStorage.getItem('token_flexwash');
            const payloadToken = JSON.parse(atob(token.split('.')[1]));
            const clienteId = String(payloadToken.id || '').split(':')[0];

            const resposta = await apiFetch(`${API_URL}/api/clientes/${clienteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endereco: novoEndereco })
            });

            if (resposta.ok) {
                setEnderecoCliente(novoEndereco);
                setEditandoEndereco(false);
            } else {
                alert('Erro ao atualizar o endereço.');
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
        setCarregando(true);

        try {
            const token = localStorage.getItem('token_flexwash');
            if (!token) {
                setErro('Sessão expirada. Faça login novamente.');
                setCarregando(false);
                return;
            }

            const payloadToken = JSON.parse(atob(token.split('.')[1]));
            const clienteId = String(payloadToken.id || '').split(':')[0];

            const payloadAgendamento = {
                cliente_id: clienteId,
                veiculos: [
                    {
                        veiculo_id: dadosAgendamento.veiculo.id,
                        pacote_id: dadosAgendamento.servico.id,
                        extras: [],
                        funcionarios: []
                    }
                ],
                data_agendamento: `${data} ${horario}:00`,
                tipo_logistica: dadosAgendamento.levaTras
            };

            const resposta = await apiFetch(`${API_URL}/api/execucoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadAgendamento)
            });

            const json = await resposta.json();

            if (resposta.ok) {
                aoConcluir();
            } else {
                setErro(json.erro || 'Erro ao registrar o agendamento.');
            }
        } catch (err) {
            console.error(err);
            setErro('Erro de conexão ao finalizar o agendamento.');
        } finally {
            setCarregando(false);
        }
    };

    const ehLevaTras = dadosAgendamento.levaTras === 'leva_tras';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '550px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
                
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                            Data, Horário e Local
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600' }}>
                            {dadosAgendamento.servico?.nome} • {dadosAgendamento.veiculo?.modelo}
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
                        </div>
                    )}

                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                                <MapPin size={14} color="#2563eb" /> 
                                {ehLevaTras ? 'Endereço de Recolha (Delivery)' : 'Local de Atendimento'}
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
                        ) : (
                            <div>
                                {!editandoEndereco ? (
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                                        {enderecoCliente}
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <input 
                                            type="text"
                                            value={novoEndereco}
                                            onChange={(e) => setNovoEndereco(e.target.value)}
                                            placeholder="Digite o novo endereço completo..."
                                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                        />
                                        <button onClick={salvandoEndereco ? null : salvarNovoEndereco} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <Check size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                                <Calendar size={14} /> Data do Atendimento
                            </label>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#2563eb' }}>
                                Selecionada: {formatarDataBr(data)}
                            </span>
                        </div>
                        <input 
                            type="date" 
                            min={hoje}
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            <Clock size={14} /> Horários Disponíveis
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {horariosDisponiveis.map((h) => {
                                const selecionado = horario === h;
                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => setHorario(h)}
                                        style={{
                                            padding: '0.65rem',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            backgroundColor: selecionado ? '#eff6ff' : '#ffffff',
                                            borderColor: selecionado ? '#3b82f6' : '#e2e8f0',
                                            color: selecionado ? '#1e40af' : '#475569',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {h}
                                    </button>
                                );
                            })}
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
                        <button onClick={lidarComFinalizacao} disabled={carregando} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', color: '#ffffff', backgroundColor: '#0f172a', cursor: 'pointer', border: 'none', fontSize: '0.85rem', opacity: carregando ? 0.7 : 1 }}>
                            {carregando ? 'A confirmar...' : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}