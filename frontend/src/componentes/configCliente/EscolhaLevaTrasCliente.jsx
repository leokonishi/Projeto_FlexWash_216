import React, { useState } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { formatarMoeda } from '../../utils/precos';

// Passo 3 do agendamento: o cliente leva o carro ou usa o leva e traz.
// `levaTras` vem de GET /api/agendamentos/config: { disponivel, taxa_por_veiculo }
export default function EscolhaLevaTrasCliente({ resumo, levaTras, tipoInicial, aoAvancar, aoVoltar, aoCancelar }) {
    // Estado para a opção escolhida: 'leva_tras' ou 'cliente_leva'
    const [tipoLogistica, setTipoLogistica] = useState(tipoInicial || 'cliente_leva');

    const qtdVeiculos = resumo.length;
    const lavagemCentavos = resumo.reduce((acc, item) => acc + item.subtotalCentavos, 0);
    const levaTrasDisponivel = Boolean(levaTras?.disponivel);
    const taxaCentavos = levaTrasDisponivel ? Math.round(Number(levaTras.taxa_por_veiculo) * 100) : 0;
    const totalCentavos = lavagemCentavos + (tipoLogistica === 'leva_tras' ? taxaCentavos * qtdVeiculos : 0);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Cabeçalho */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                            Modalidade de Atendimento
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600' }}>
                            Passo 3 de 4 • {qtdVeiculos} veículo(s) • lavagem {formatarMoeda(lavagemCentavos)}
                        </span>
                    </div>
                    <button 
                        onClick={aoCancelar}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        &times;
                    </button>
                </div>

                {/* Conteúdo com as Opções */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 0.5rem 0' }}>
                        Como prefere proceder com a recolha e entrega do veículo?
                    </p>

                    {/* Opção 1: Cliente Leva */}
                    <div 
                        onClick={() => setTipoLogistica('cliente_leva')}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            padding: '1.25rem', 
                            borderRadius: '12px', 
                            cursor: 'pointer', 
                            border: '1px solid',
                            backgroundColor: tipoLogistica === 'cliente_leva' ? '#eff6ff' : '#ffffff',
                            borderColor: tipoLogistica === 'cliente_leva' ? '#3b82f6' : '#e2e8f0',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ padding: '0.75rem', backgroundColor: tipoLogistica === 'cliente_leva' ? '#dbeafe' : '#f1f5f9', borderRadius: '10px', color: tipoLogistica === 'cliente_leva' ? '#2563eb' : '#64748b' }}>
                            <MapPin size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 0.2rem 0', color: '#0f172a', fontSize: '1rem', fontWeight: '700' }}>
                                Eu mesmo levo e busco o carro
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                Dirija-se até ao nosso pátio no horário agendado.
                            </p>
                        </div>
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            border: '2px solid', 
                            borderColor: tipoLogistica === 'cliente_leva' ? '#2563eb' : '#cbd5e1',
                            backgroundColor: tipoLogistica === 'cliente_leva' ? '#2563eb' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }}>
                            {tipoLogistica === 'cliente_leva' && '✓'}
                        </div>
                    </div>

                    {/* Opção 2: Leva e Trás */}
                    <div 
                        onClick={() => levaTrasDisponivel && setTipoLogistica('leva_tras')}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            padding: '1.25rem', 
                            borderRadius: '12px', 
                            cursor: levaTrasDisponivel ? 'pointer' : 'not-allowed', 
                            opacity: levaTrasDisponivel ? 1 : 0.55, 
                            border: '1px solid',
                            backgroundColor: tipoLogistica === 'leva_tras' ? '#eff6ff' : '#ffffff',
                            borderColor: tipoLogistica === 'leva_tras' ? '#3b82f6' : '#e2e8f0',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ padding: '0.75rem', backgroundColor: tipoLogistica === 'leva_tras' ? '#dbeafe' : '#f1f5f9', borderRadius: '10px', color: tipoLogistica === 'leva_tras' ? '#2563eb' : '#64748b' }}>
                            <Truck size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 0.2rem 0', color: '#0f172a', fontSize: '1rem', fontWeight: '700' }}>
                                Serviço Leva e Trás (Delivery)
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                A nossa equipe busca e entrega o seu veículo no endereço cadastrado.
                            </p>
                            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', fontWeight: '700', color: levaTrasDisponivel ? '#15803d' : '#b91c1c' }}>
                                {levaTrasDisponivel
                                    ? `+ ${formatarMoeda(taxaCentavos)} por veículo` + (qtdVeiculos > 1 ? ` (${formatarMoeda(taxaCentavos * qtdVeiculos)} no total)` : '')
                                    : 'Indisponível no momento'}
                            </p>
                        </div>
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            border: '2px solid', 
                            borderColor: tipoLogistica === 'leva_tras' ? '#2563eb' : '#cbd5e1',
                            backgroundColor: tipoLogistica === 'leva_tras' ? '#2563eb' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }}>
                            {tipoLogistica === 'leva_tras' && '✓'}
                        </div>
                    </div>

                </div>

                {/* Rodapé */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        onClick={aoVoltar}
                        style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', color: '#475569', backgroundColor: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        Voltar
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>{formatarMoeda(totalCentavos)}</div>
                        </div>
                        <button 
                            onClick={aoCancelar}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: '600', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => aoAvancar(tipoLogistica)}
                            style={{ 
                                padding: '0.75rem 1.5rem', 
                                borderRadius: '8px', 
                                fontWeight: '700', 
                                color: '#ffffff', 
                                backgroundColor: '#0f172a', 
                                cursor: 'pointer', 
                                border: 'none',
                                fontSize: '0.85rem',
                                transition: 'background 0.2s'
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