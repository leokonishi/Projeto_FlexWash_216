import React, { useState, useEffect } from 'react';
import { apiFetch, API_URL } from "../../utils/api";
import { PlusCircle, Car, Trash2 } from 'lucide-react';

// Passo 1 do agendamento: o cliente escolhe UM OU MAIS veículos (o preço depende do porte de cada um)
export default function EscolhaVeiculoCliente({ veiculosIniciais = [], aoAvancar, aoCancelar }) {
    const [veiculos, setVeiculos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [idsSelecionados, setIdsSelecionados] = useState(veiculosIniciais.map((v) => v.id));

    // Controle para alternar entre a lista e o formulário de cadastro
    const [modoCadastro, setModoCadastro] = useState(false);
    
    // Lista de marcas vindas da API da FIPE
    const [listaMarcas, setListaMarcas] = useState([]);

    // Estados do formulário de novo veículo
    const [novoVeiculo, setNovoVeiculo] = useState({
        marca: 'Honda',
        modelo: '',
        placa: '',
        cor: '',
        porte: 'Médio'
    });
    const [salvando, setSalvando] = useState(false);
    const [erroCadastro, setErroCadastro] = useState(null);

    // Veículos do cliente logado (o backend usa o id do token)
    const carregarVeiculos = async () => {
        setCarregando(true);
        try {
            const respostaVeiculos = await apiFetch(`${API_URL}/api/me/veiculos`);
            if (respostaVeiculos.ok) {
                setVeiculos(await respostaVeiculos.json());
            } else {
                setErro('Erro ao carregar a sua frota de veículos.');
            }
        } catch {
            setErro('Falha de conexão com o servidor.');
        } finally {
            setCarregando(false);
        }
    };

    // Marcas da Tabela FIPE (API pública). Se ela estiver fora do ar, o formulário
    // usa a lista fixa de marcas e o resto da tela continua funcionando.
    const carregarMarcasFipe = async () => {
        try {
            const respostaMarcas = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
            if (respostaMarcas.ok) {
                const marcasFipe = await respostaMarcas.json();
                if (marcasFipe.length > 0) {
                    setListaMarcas(marcasFipe);
                    setNovoVeiculo(prev => ({ ...prev, marca: marcasFipe[0].nome }));
                }
            }
        } catch (erroFipe) {
            console.warn('Tabela FIPE indisponível, usando a lista fixa de marcas.', erroFipe);
        }
    };

    useEffect(() => {
        carregarVeiculos();
        carregarMarcasFipe();
    }, []);

    const lidarComCadastroVeiculo = async (e) => {
        e.preventDefault();
        setErroCadastro(null);
        setSalvando(true);

        try {
            const resPost = await apiFetch(`${API_URL}/api/me/veiculos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoVeiculo)
            });

            const json = await resPost.json();

            if (resPost.ok) {
                setModoCadastro(false);
                setNovoVeiculo(prev => ({ ...prev, modelo: '', placa: '', cor: '' }));
                await carregarVeiculos();
                // Já deixa o carro recém-cadastrado selecionado
                setIdsSelecionados(prev => [...prev, json.veiculo.id]);
            } else {
                setErroCadastro(json.erro || 'Erro ao cadastrar veículo.');
            }
        } catch (erro) {
            setErroCadastro('Erro de conexão ao salvar o veículo.');
        } finally {
            setSalvando(false);
        }
    };

    // Função para remover um veículo cadastrado
    const lidarComExclusaoVeiculo = async (e, veiculoId, modeloCarro) => {
        e.stopPropagation(); // Evita que clique no botão de lixeira selecione o carro ao mesmo tempo
        
        if (!window.confirm(`Tem certeza que deseja remover o veículo ${modeloCarro}?`)) {
            return;
        }

        try {
            const resposta = await apiFetch(`${API_URL}/api/me/veiculos/${veiculoId}`, { method: 'DELETE' });

            if (resposta.ok) {
                // Tira o carro excluído da seleção e da lista
                setIdsSelecionados(prev => prev.filter(id => id !== veiculoId));
                setVeiculos(prev => prev.filter(v => v.id !== veiculoId));
            } else {
                const json = await resposta.json().catch(() => ({}));
                alert(json.erro || 'Erro ao remover o veículo.');
            }
        } catch (erro) {
            console.error('Erro ao excluir veículo:', erro);
            alert('Falha de conexão ao tentar remover o veículo.');
        }
    };

    const alternarSelecao = (veiculoId) => {
        setIdsSelecionados(prev =>
            prev.includes(veiculoId) ? prev.filter(id => id !== veiculoId) : [...prev, veiculoId]
        );
    };

    // Mantém a ordem da lista na tela
    const veiculosSelecionados = veiculos.filter(v => idsSelecionados.includes(v.id));
    const podeAvancar = veiculosSelecionados.length > 0;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '650px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Cabeçalho */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                            {modoCadastro ? 'Cadastrar Novo Veículo' : 'Quais veículos vamos lavar?'}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600' }}>
                            Passo 1 de 4 • Pode escolher mais de um veículo
                        </span>
                    </div>
                    <button 
                        onClick={aoCancelar}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        &times;
                    </button>
                </div>

                {/* Conteúdo */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    
                    {!modoCadastro && (
                        <>
                            {carregando && (
                                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                                    <p>Carregando os seus veículos...</p>
                                </div>
                            )}
                            
                            {erro && (
                                <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {erro}
                                </div>
                            )}

                            {!carregando && !erro && (
                                <div>
                                    {veiculos.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                            <p style={{ color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Ainda não tem nenhum veículo cadastrado.</p>
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Cadastre o seu carro agora mesmo para prosseguir com o agendamento.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            {veiculos.map((veiculo) => {
                                                const isSelecionado = idsSelecionados.includes(veiculo.id);

                                                return (
                                                    <div 
                                                        key={veiculo.id}
                                                        onClick={() => alternarSelecao(veiculo.id)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            padding: '1.25rem', 
                                                            borderRadius: '12px', 
                                                            cursor: 'pointer', 
                                                            border: '1px solid',
                                                            backgroundColor: isSelecionado ? '#eff6ff' : '#ffffff',
                                                            borderColor: isSelecionado ? '#3b82f6' : '#e2e8f0',
                                                            boxShadow: isSelecionado ? '0 1px 3px rgba(59, 130, 246, 0.2)' : 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                                <Car size={18} color={isSelecionado ? '#2563eb' : '#64748b'} />
                                                                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: '600' }}>
                                                                    {veiculo.marca} {veiculo.modelo}
                                                                </h4>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                                <span>Cor: <strong style={{ color: '#334155' }}>{veiculo.cor}</strong></span>
                                                                <span>PLACA: <strong style={{ color: '#334155', textTransform: 'uppercase' }}>{veiculo.placa}</strong></span>
                                                                <span>Porte: <strong style={{ color: '#334155', textTransform: 'capitalize' }}>{veiculo.porte || 'Médio'}</strong></span>
                                                            </div>
                                                        </div>

                                                        {/* Botões à direita: Tag de seleção e Botão de Excluir */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => lidarComExclusaoVeiculo(e, veiculo.id, `${veiculo.marca} ${veiculo.modelo}`)}
                                                                title="Remover veículo"
                                                                style={{ padding: '0.45rem', backgroundColor: '#ffe4e6', border: '1px solid #fecdd3', color: '#e11d48', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>

                                                            <div style={{ 
                                                                width: '24px', 
                                                                height: '24px', 
                                                                borderRadius: '6px', 
                                                                border: '2px solid', 
                                                                borderColor: isSelecionado ? '#2563eb' : '#cbd5e1',
                                                                backgroundColor: isSelecionado ? '#2563eb' : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#ffffff',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {isSelecionado && '✓'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => setModoCadastro(true)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '0.85rem', 
                                            border: '1px dashed #cbd5e1', 
                                            backgroundColor: '#f8fafc', 
                                            color: '#2563eb', 
                                            fontWeight: '600', 
                                            borderRadius: '10px', 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '0.5rem', 
                                            fontSize: '0.9rem',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <PlusCircle size={18} />
                                        Cadastrar Novo Veículo
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Formulário de Cadastro */}
                    {modoCadastro && (
                        <form onSubmit={lidarComCadastroVeiculo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {erroCadastro && (
                                <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                                    {erroCadastro}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Marca</label>
                                    <select 
                                        value={novoVeiculo.marca}
                                        onChange={(e) => setNovoVeiculo({...novoVeiculo, marca: e.target.value})}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', boxSizing: 'border-box' }}
                                    >
                                        {listaMarcas.length > 0 ? (
                                            listaMarcas.map(m => (
                                                <option key={m.codigo} value={m.nome}>{m.nome}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option>Audi</option><option>BMW</option><option>Chevrolet</option>
                                                <option>Fiat</option><option>Ford</option><option>Honda</option>
                                                <option>Hyundai</option><option>Jeep</option><option>Toyota</option>
                                                <option>Volkswagen</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Modelo</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ex: Civic LX 2003"
                                        value={novoVeiculo.modelo}
                                        onChange={(e) => setNovoVeiculo({...novoVeiculo, modelo: e.target.value})}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Placa</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="ABC1D23"
                                        value={novoVeiculo.placa}
                                        onChange={(e) => setNovoVeiculo({...novoVeiculo, placa: e.target.value})}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', textTransform: 'uppercase', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Cor</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ex: Prata"
                                        value={novoVeiculo.cor}
                                        onChange={(e) => setNovoVeiculo({...novoVeiculo, cor: e.target.value})}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Porte do Veículo</label>
                                <select 
                                    value={novoVeiculo.porte}
                                    onChange={(e) => setNovoVeiculo({...novoVeiculo, porte: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', boxSizing: 'border-box' }}
                                >
                                    <option value="Pequeno">Pequeno (hatch, compacto)</option>
                                    <option value="Médio">Médio (sedã, SUV compacto)</option>
                                    <option value="Grande">Grande (SUV, picape, van)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button"
                                    onClick={() => setModoCadastro(false)}
                                    style={{ padding: '0.75rem 1.25rem', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={salvando}
                                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', opacity: salvando ? 0.7 : 1 }}
                                >
                                    {salvando ? 'Salvando...' : 'Salvar e Selecionar'}
                                </button>
                            </div>
                        </form>
                    )}

                </div>

                {/* Rodapé padrão */}
                {!modoCadastro && (
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                            {veiculosSelecionados.length === 0
                                ? 'Nenhum veículo selecionado'
                                : `${veiculosSelecionados.length} veículo(s) selecionado(s)`}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={aoCancelar}
                                style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: '600', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={!podeAvancar}
                                onClick={() => aoAvancar(veiculosSelecionados)}
                                style={{ 
                                    padding: '0.75rem 1.5rem', 
                                    borderRadius: '8px', 
                                    fontWeight: '700', 
                                    color: '#ffffff', 
                                    backgroundColor: podeAvancar ? '#0f172a' : '#cbd5e1', 
                                    cursor: podeAvancar ? 'pointer' : 'not-allowed', 
                                    border: 'none',
                                    fontSize: '0.85rem',
                                    transition: 'background 0.2s'
                                }}
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}