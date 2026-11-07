import React, { useState, useEffect } from 'react';
import { apiFetch, API_URL } from "../../utils/api";
import { PlusCircle, Car, Trash2, ArrowRight, Check, Loader2 } from 'lucide-react';
import ModalPasso, { Marcador } from '../ui/ModalPasso';

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

    const campoVeiculo = (rotulo, conteudo) => (
        <div>
            <label className="fw-label">{rotulo}</label>
            {conteudo}
        </div>
    );

    return (
        <ModalPasso
            passo={1}
            titulo={modoCadastro ? 'Novo veículo' : 'Quais carros vamos lavar?'}
            subtitulo={modoCadastro ? 'Cadastre o carro uma vez e ele fica salvo na sua garagem.' : 'Pode escolher mais de um.'}
            aoFechar={aoCancelar}
            aoVoltar={modoCadastro ? () => setModoCadastro(false) : null}
            rodape={!modoCadastro && (
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-tinta-500">
                        {veiculosSelecionados.length === 0
                            ? 'Nenhum selecionado'
                            : `${veiculosSelecionados.length} ${veiculosSelecionados.length === 1 ? 'carro selecionado' : 'carros selecionados'}`}
                    </span>
                    <button disabled={!podeAvancar} onClick={() => aoAvancar(veiculosSelecionados)} className="fw-btn-primario px-6">
                        Continuar <ArrowRight size={17} />
                    </button>
                </div>
            )}
        >
            {!modoCadastro && (
                <>
                    {carregando && (
                        <div className="space-y-3">
                            {[0, 1].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-tinta-100" />)}
                        </div>
                    )}

                    {erro && <div className="fw-alerta-erro mb-4">{erro}</div>}

                    {!carregando && !erro && (
                        <div className="space-y-3">
                            {veiculos.length === 0 ? (
                                <div className="flex flex-col items-center px-4 py-8 text-center">
                                    <span className="grid size-14 place-items-center rounded-2xl bg-marca-50 text-marca-600"><Car size={26} /></span>
                                    <p className="mt-4 font-semibold text-tinta-900">Sua garagem está vazia</p>
                                    <p className="mt-1 text-sm text-tinta-500">Cadastre o seu carro para continuar o agendamento.</p>
                                </div>
                            ) : (
                                veiculos.map((veiculo) => {
                                    const isSelecionado = idsSelecionados.includes(veiculo.id);
                                    return (
                                        <div
                                            key={veiculo.id}
                                            role="checkbox"
                                            aria-checked={isSelecionado}
                                            tabIndex={0}
                                            data-ativo={isSelecionado}
                                            onClick={() => alternarSelecao(veiculo.id)}
                                            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternarSelecao(veiculo.id); } }}
                                            className="fw-opcao"
                                        >
                                            <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${isSelecionado ? 'bg-marca-600 text-white' : 'bg-tinta-100 text-tinta-500'}`}>
                                                <Car size={20} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-tinta-900">{veiculo.marca} {veiculo.modelo}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-500">
                                                    <span className="rounded-md border border-tinta-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-tinta-800">{veiculo.placa}</span>
                                                    <span>{veiculo.cor}</span>
                                                    <span className="text-tinta-300">•</span>
                                                    <span>Porte {veiculo.porte || 'Médio'}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => lidarComExclusaoVeiculo(e, veiculo.id, `${veiculo.marca} ${veiculo.modelo}`)}
                                                title="Remover veículo"
                                                aria-label={`Remover ${veiculo.marca} ${veiculo.modelo}`}
                                                className="fw-btn-perigo"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                            <Marcador ativo={isSelecionado} />
                                        </div>
                                    );
                                })
                            )}

                            <button
                                type="button"
                                onClick={() => setModoCadastro(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tinta-200 py-3.5 text-sm font-semibold text-marca-600 transition-colors hover:border-marca-300 hover:bg-marca-50/50"
                            >
                                <PlusCircle size={18} /> Cadastrar novo veículo
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Formulário de Cadastro */}
            {modoCadastro && (
                <form onSubmit={lidarComCadastroVeiculo} className="grid grid-cols-2 gap-4">
                    {erroCadastro && <div className="fw-alerta-erro col-span-2">{erroCadastro}</div>}

                    <div className="col-span-2 sm:col-span-1">
                        {campoVeiculo('Marca', (
                            <select
                                value={novoVeiculo.marca}
                                onChange={(e) => setNovoVeiculo({...novoVeiculo, marca: e.target.value})}
                                className="fw-input cursor-pointer"
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
                        ))}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        {campoVeiculo('Modelo', (
                            <input type="text" required placeholder="Ex: Civic LX 2003" className="fw-input"
                                value={novoVeiculo.modelo}
                                onChange={(e) => setNovoVeiculo({...novoVeiculo, modelo: e.target.value})} />
                        ))}
                    </div>
                    {campoVeiculo('Placa', (
                        <input type="text" required placeholder="ABC1D23" className="fw-input font-mono uppercase tracking-wider"
                            value={novoVeiculo.placa}
                            onChange={(e) => setNovoVeiculo({...novoVeiculo, placa: e.target.value})} />
                    ))}
                    {campoVeiculo('Cor', (
                        <input type="text" required placeholder="Ex: Prata" className="fw-input"
                            value={novoVeiculo.cor}
                            onChange={(e) => setNovoVeiculo({...novoVeiculo, cor: e.target.value})} />
                    ))}

                    <div className="col-span-2">
                        <span className="fw-label">Porte do veículo</span>
                        <div className="grid grid-cols-3 gap-2">
                            {[['Pequeno', 'Hatch, compacto'], ['Médio', 'Sedã, SUV compacto'], ['Grande', 'SUV, picape, van']].map(([porte, exemplo]) => (
                                <button
                                    key={porte}
                                    type="button"
                                    data-ativo={novoVeiculo.porte === porte}
                                    onClick={() => setNovoVeiculo({ ...novoVeiculo, porte })}
                                    className="fw-opcao flex-col items-start gap-0.5 p-3"
                                >
                                    <span className="text-sm font-semibold text-tinta-900">{porte}</span>
                                    <span className="text-[11px] leading-tight text-tinta-500">{exemplo}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-2 mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => setModoCadastro(false)} className="fw-btn-contorno">
                            Cancelar
                        </button>
                        <button type="submit" disabled={salvando} className="fw-btn-primario">
                            {salvando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                            {salvando ? 'Salvando...' : 'Salvar e selecionar'}
                        </button>
                    </div>
                </form>
            )}
        </ModalPasso>
    );
}
