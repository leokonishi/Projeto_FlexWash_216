import React, { useState, useEffect, useCallback } from 'react';
import { Truck, MapPin, Edit3, Check, Loader2, ArrowRight } from 'lucide-react';
import ModalPasso, { Marcador } from '../ui/ModalPasso';
import { apiFetch, API_URL } from '../../utils/api';
import { formatarMoeda } from '../../utils/precos';
import FormEnderecoCep from '../FormEnderecoCep';
import { ENDERECO_VAZIO, enderecoCompleto, montarEndereco, separarEndereco, partesParaApi } from '../../utils/endereco';

const fmtKm = (km) => Number(km).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// Passo 3 do agendamento: o cliente leva o carro ou usa o leva e traz.
// `levaTras` vem de GET /api/agendamentos/config: { ativo, raio_km }.
// Se o leva e traz atende o endereço do cliente (e por quanto) vem de
// GET /api/agendamentos/leva-e-traz, que mede a distância de carro no mapa.
// O endereço de busca é conferido e editado aqui, porque é ele que decide se o
// leva e traz fica disponível.
export default function EscolhaLevaTrasCliente({ resumo, levaTras, tipoInicial, aoAvancar, aoVoltar, aoCancelar }) {
    // Estado para a opção escolhida: 'leva_tras' ou 'cliente_leva'
    const [tipoLogistica, setTipoLogistica] = useState(tipoInicial || 'cliente_leva');

    const servicoAtivo = Boolean(levaTras?.ativo);
    const [avaliacao, setAvaliacao] = useState(null); // resposta de /agendamentos/leva-e-traz
    const [verificando, setVerificando] = useState(false);

    const [editandoEndereco, setEditandoEndereco] = useState(false);
    const [novoEndereco, setNovoEndereco] = useState(ENDERECO_VAZIO); // partes do formulário com CEP
    const [salvandoEndereco, setSalvandoEndereco] = useState(false);
    const [erroEndereco, setErroEndereco] = useState(null);

    const verificar = useCallback(async () => {
        setVerificando(true);
        try {
            const resposta = await apiFetch(`${API_URL}/api/agendamentos/leva-e-traz`);
            const json = await resposta.json().catch(() => ({}));
            const resultado = resposta.ok
                ? json
                : { disponivel: false, motivo: 'erro', mensagem: json.erro || 'Não foi possível verificar o leva e traz.' };
            setAvaliacao(resultado);
            // Endereço antigo (texto livre) não se separa em partes: o cliente refaz pelo CEP
            setNovoEndereco(separarEndereco(resultado.endereco_cliente) || ENDERECO_VAZIO);
            // Sem endereço, ou endereço antigo em texto livre: pede o endereço pelo CEP
            if (resultado.motivo === 'sem_endereco' || (resultado.endereco_cliente && !separarEndereco(resultado.endereco_cliente))) {
                setEditandoEndereco(true);
            }
            if (!resultado.disponivel) setTipoLogistica('cliente_leva');
        } catch {
            setAvaliacao({ disponivel: false, motivo: 'erro', mensagem: 'Falha de conexão ao verificar o leva e traz.' });
            setTipoLogistica('cliente_leva');
        } finally {
            setVerificando(false);
        }
    }, []);

    useEffect(() => {
        if (servicoAtivo) verificar();
        else setTipoLogistica('cliente_leva');
    }, [servicoAtivo, verificar]);

    const salvarNovoEndereco = async () => {
        if (salvandoEndereco) return;
        if (!enderecoCompleto(novoEndereco)) {
            setErroEndereco('Preencha CEP, rua, número, bairro, cidade e UF.');
            return;
        }
        setSalvandoEndereco(true);
        setErroEndereco(null);
        try {
            const resposta = await apiFetch(`${API_URL}/api/me/endereco`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endereco: montarEndereco(novoEndereco), endereco_partes: partesParaApi(novoEndereco) })
            });
            const json = await resposta.json().catch(() => ({}));
            if (resposta.ok) {
                setEditandoEndereco(false);
                await verificar(); // novo endereço -> nova distância
            } else {
                setErroEndereco(json.erro || 'Erro ao atualizar o endereço.');
            }
        } catch {
            setErroEndereco('Falha de conexão ao salvar o endereço.');
        } finally {
            setSalvandoEndereco(false);
        }
    };

    const qtdVeiculos = resumo.length;
    const lavagemCentavos = resumo.reduce((acc, item) => acc + item.subtotalCentavos, 0);
    const levaTrasDisponivel = Boolean(avaliacao?.disponivel) && !verificando && !editandoEndereco;
    const taxaCentavos = avaliacao?.disponivel ? Math.round(Number(avaliacao.taxa_por_veiculo) * 100) : 0;
    const totalCentavos = lavagemCentavos + (tipoLogistica === 'leva_tras' ? taxaCentavos * qtdVeiculos : 0);

    // Linha de preço / situação embaixo do título do leva e traz
    let situacao;
    if (!servicoAtivo) situacao = { cor: 'text-red-600', texto: 'Indisponível no momento' };
    else if (verificando) situacao = { cor: 'text-tinta-500', texto: 'Calculando a distância até o seu endereço...' };
    else if (avaliacao?.disponivel) {
        const valor = taxaCentavos === 0
            ? 'Grátis'
            : `+ ${formatarMoeda(taxaCentavos)} por veículo` + (qtdVeiculos > 1 ? ` (${formatarMoeda(taxaCentavos * qtdVeiculos)} no total)` : '');
        situacao = { cor: 'text-verde-700', texto: valor };
    } else situacao = { cor: 'text-red-600', texto: avaliacao?.mensagem || 'Indisponível para o seu endereço' };

    const opcao = (tipo, Icone, titulo, descricao, extra, habilitada = true) => {
        const ativo = tipoLogistica === tipo;
        return (
            <div
                role="radio"
                aria-checked={ativo}
                aria-disabled={!habilitada}
                tabIndex={habilitada ? 0 : -1}
                data-ativo={ativo}
                onClick={() => habilitada && setTipoLogistica(tipo)}
                onKeyDown={(e) => { if (habilitada && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setTipoLogistica(tipo); } }}
                className="fw-opcao items-start p-4"
            >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl transition-colors ${ativo ? 'bg-marca-600 text-white' : 'bg-tinta-100 text-tinta-500'}`}>
                    <Icone size={22} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-tinta-900">{titulo}</span>
                    <span className="mt-0.5 block text-sm text-tinta-500">{descricao}</span>
                    {extra}
                </span>
                <Marcador ativo={ativo} redondo />
            </div>
        );
    };

    return (
        <ModalPasso
            passo={3}
            titulo="Como o carro chega até nós?"
            subtitulo={`${qtdVeiculos} ${qtdVeiculos === 1 ? 'carro' : 'carros'} · lavagem ${formatarMoeda(lavagemCentavos)}`}
            aoFechar={aoCancelar}
            aoVoltar={aoVoltar}
            rodape={
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-tinta-500">Total</p>
                        <p className="font-display text-xl font-extrabold text-tinta-950">{formatarMoeda(totalCentavos)}</p>
                    </div>
                    <button
                        onClick={() => aoAvancar(tipoLogistica, tipoLogistica === 'leva_tras' ? avaliacao : null)}
                        disabled={tipoLogistica === 'leva_tras' && !levaTrasDisponivel}
                        className="fw-btn-primario px-6"
                    >
                        Continuar <ArrowRight size={17} />
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
                {opcao('cliente_leva', MapPin, 'Eu levo e busco o carro', 'Traga o carro até o nosso pátio no horário agendado.')}
                {opcao(
                    'leva_tras',
                    Truck,
                    'Leva e traz',
                    'Nossa equipe busca e devolve o carro no seu endereço.',
                    <span className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${situacao.cor}`}>
                        {verificando && <Loader2 size={14} className="animate-spin" />}
                        {situacao.texto}
                    </span>,
                    levaTrasDisponivel
                )}

                {/* Endereço de busca: decide se o leva e traz atende */}
                {servicoAtivo && (
                    <div className="rounded-2xl border border-tinta-200 bg-tinta-50/70 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="fw-rotulo-secao flex items-center gap-1.5">
                                <MapPin size={13} className="text-marca-600" /> Endereço de busca
                            </span>
                            {!editandoEndereco && !verificando && (
                                <button onClick={() => setEditandoEndereco(true)} className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:text-marca-700">
                                    <Edit3 size={14} /> Alterar
                                </button>
                            )}
                        </div>

                        {editandoEndereco ? (
                            <div className="space-y-3">
                                {avaliacao?.endereco_cliente && !separarEndereco(avaliacao.endereco_cliente) && (
                                    <p className="fw-alerta-aviso">
                                        Endereço atual: <strong>{avaliacao.endereco_cliente}</strong>. Confirme pelo CEP para calcularmos a distância.
                                    </p>
                                )}
                                <FormEnderecoCep valor={novoEndereco} aoMudar={setNovoEndereco} compacto desabilitado={salvandoEndereco} />
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    {avaliacao?.endereco_cliente && (
                                        <button type="button" onClick={() => { setEditandoEndereco(false); setErroEndereco(null); }} className="fw-btn-contorno h-10">
                                            Cancelar
                                        </button>
                                    )}
                                    <button type="button" onClick={salvarNovoEndereco} disabled={salvandoEndereco} className="fw-btn-primario h-10">
                                        {salvandoEndereco ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {salvandoEndereco ? 'Verificando...' : 'Salvar e verificar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[15px] font-medium text-tinta-900">{avaliacao?.endereco_cliente || '—'}</p>
                        )}

                        {erroEndereco && <p className="mt-2 text-sm text-red-600">{erroEndereco}</p>}

                        {!editandoEndereco && !verificando && avaliacao?.distancia_km != null && (
                            <p className="mt-2 text-xs text-tinta-500">
                                {avaliacao.metodo_distancia === 'estimativa' ? 'Distância estimada' : 'Distância de carro'}: <strong className="text-tinta-700">{fmtKm(avaliacao.distancia_km)} km</strong>
                                {avaliacao.raio_km != null && ` · atendemos até ${fmtKm(avaliacao.raio_km)} km`}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </ModalPasso>
    );
}
