import React, { useState, useEffect } from 'react';
import { Car, ArrowRight, Sparkles } from 'lucide-react';
import ModalPasso, { Marcador } from '../ui/ModalPasso';
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

    return (
        <ModalPasso
            passo={2}
            titulo="Escolha os serviços"
            subtitulo="O preço acompanha o porte de cada carro."
            largura="sm:max-w-2xl"
            aoFechar={aoCancelar}
            aoVoltar={aoVoltar}
            rodape={
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-tinta-500">Total · {veiculos.length} {veiculos.length === 1 ? 'carro' : 'carros'}</p>
                        <p className="font-display text-xl font-extrabold text-tinta-950">{formatarMoeda(totalCentavos)}</p>
                    </div>
                    <button disabled={!todosComServico} onClick={() => aoAvancar(selecoes, montarResumo())} className="fw-btn-primario px-6">
                        Continuar <ArrowRight size={17} />
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                {carregando && (
                    <div className="space-y-3">
                        {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-tinta-100" />)}
                    </div>
                )}

                {erro && <div className="fw-alerta-erro">{erro}</div>}

                {!carregando && !erro && pacotes.length === 0 && (
                    <p className="py-8 text-center text-sm text-tinta-500">Nenhum serviço disponível no momento.</p>
                )}

                {!carregando && !erro && pacotes.length > 0 && veiculos.map((veiculo) => {
                    const selecao = selecoes[veiculo.id];
                    return (
                        <div key={veiculo.id} className="overflow-hidden rounded-2xl border border-tinta-200">
                            {/* Veículo */}
                            <div className="flex items-center justify-between gap-3 bg-tinta-50 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-marca-600 ring-1 ring-tinta-200"><Car size={16} /></span>
                                    <strong className="truncate text-tinta-900">{veiculo.marca} {veiculo.modelo}</strong>
                                    <span className="hidden font-mono text-xs uppercase text-tinta-500 sm:inline">{veiculo.placa}</span>
                                </div>
                                <span className="shrink-0 rounded-full bg-marca-100 px-2.5 py-1 text-xs font-semibold text-marca-800">
                                    Porte {veiculo.porte}
                                </span>
                            </div>

                            <div className="space-y-2 p-4">
                                <p className="fw-rotulo-secao">Lavagem · escolha 1</p>
                                {pacotes.map((pacote) => {
                                    const ativo = selecao.pacoteId === pacote.id;
                                    return (
                                        <button type="button" key={pacote.id} data-ativo={ativo} onClick={() => escolherPacote(veiculo.id, pacote.id)} className="fw-opcao">
                                            <Marcador ativo={ativo} redondo />
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-tinta-900">{pacote.nome}</span>
                                                {pacote.descricao && <span className="block text-xs text-tinta-500">{pacote.descricao}</span>}
                                            </span>
                                            <span className="whitespace-nowrap font-semibold text-verde-700">
                                                {formatarMoeda(precoCentavos(pacote, veiculo.porte))}
                                            </span>
                                        </button>
                                    );
                                })}

                                {extras.length > 0 && (
                                    <>
                                        <p className="fw-rotulo-secao flex items-center gap-1.5 pt-3"><Sparkles size={13} className="text-ouro-500" /> Extras · opcional</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {extras.map((extra) => {
                                                const ativo = selecao.extraIds.includes(extra.id);
                                                return (
                                                    <button type="button" key={extra.id} data-ativo={ativo} onClick={() => alternarExtra(veiculo.id, extra.id)} className="fw-opcao py-3">
                                                        <Marcador ativo={ativo} />
                                                        <span className="min-w-0 flex-1 text-sm font-medium text-tinta-900">{extra.nome}</span>
                                                        <span className="whitespace-nowrap text-sm font-semibold text-verde-700">
                                                            + {formatarMoeda(precoCentavos(extra, veiculo.porte))}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Subtotal do veículo */}
                            <div className="flex items-center justify-between border-t border-dashed border-tinta-200 px-4 py-3 text-sm">
                                <span className={selecao.pacoteId === null ? 'text-ouro-700' : 'text-tinta-500'}>
                                    {selecao.pacoteId === null ? 'Escolha uma lavagem para este carro' : 'Subtotal deste carro'}
                                </span>
                                <strong className="text-tinta-950">{formatarMoeda(subtotalCentavos(veiculo))}</strong>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ModalPasso>
    );
}
