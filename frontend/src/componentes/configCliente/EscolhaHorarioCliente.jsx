import React, { useRef, useState } from 'react';
import { MapPin, Car, Check, Truck, Loader2 } from 'lucide-react';
import ModalPasso from '../ui/ModalPasso';
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
    // Trava imediata contra cliques repetidos: o estado `carregando` só chega no próximo
    // render, então dois cliques rápidos ainda passariam por ele.
    const enviandoRef = useRef(false);
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
        if (enviandoRef.current || confirmado) return;
        setErro(null);
        setSugestao(null);

        if (!tudoEscolhido) {
            setErro(porVeiculo ? 'Escolha um horário para cada carro.' : 'Escolha um horário.');
            return;
        }
        if (resumo.length === 0 || resumo.some(item => !item.veiculo?.id || !item.pacote?.id)) {
            setErro('Volte ao início e escolha o veículo e o serviço de cada carro.');
            return;
        }
        if (ehLevaTras && !enderecoCliente) {
            setErro('Volte ao passo anterior e informe o endereço de busca do veículo.');
            return;
        }

        enviandoRef.current = true;
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
            enviandoRef.current = false;
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

    // ---------- Tela de sucesso ----------
    if (confirmado) {
        return (
            <ModalPasso
                titulo="Agendamento confirmado"
                aoFechar={aoConcluir}
                rodape={<button onClick={aoConcluir} className="fw-btn-primario w-full">Pronto</button>}
            >
                <div className="flex flex-col items-center text-center">
                    <span className="relative grid size-16 place-items-center rounded-full bg-verde-100 text-verde-600">
                        <span className="absolute inset-0 animate-ping rounded-full bg-verde-200/60 [animation-iteration-count:2]" />
                        <Check size={32} strokeWidth={2.5} className="relative" />
                    </span>
                    <p className="mt-4 font-display text-xl font-extrabold text-tinta-950">Tudo certo!</p>
                    <p className="mt-1 max-w-sm text-sm text-tinta-500">
                        {ehLevaTras
                            ? `Vamos buscar o carro em: ${enderecoCliente}`
                            : `Leve o carro até ${localLavaRapido} no horário marcado.`}
                    </p>
                </div>

                <div className="mt-6 rounded-2xl border border-tinta-200 bg-tinta-50/70 p-4">
                    {confirmado.veiculos.map(v => (
                        <div key={v.execucao_id} className="flex items-start justify-between gap-3 py-2 text-sm">
                            <span>
                                <strong className="block text-tinta-900">{nomeVeiculo(v.veiculo_id)}</strong>
                                <span className="text-tinta-500">{formatarDataBr(v.data)} às {v.horario}</span>
                            </span>
                            <span className="font-semibold text-tinta-900">{formatarMoeda(Math.round(Number(v.valor_total) * 100))}</span>
                        </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-tinta-200 pt-3 font-bold text-tinta-950">
                        <span>Total</span>
                        <span>{formatarMoeda(Math.round(Number(confirmado.valor_total) * 100))}</span>
                    </div>
                </div>
            </ModalPasso>
        );
    }

    return (
        <ModalPasso
            passo={4}
            titulo="Data, horário e resumo"
            subtitulo={`${resumo.length} ${resumo.length === 1 ? 'carro' : 'carros'} · ${ehLevaTras ? 'Leva e traz' : 'Eu levo o carro'}`}
            aoFechar={aoCancelar}
            aoVoltar={carregando ? null : aoVoltar}
            rodape={
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-tinta-500">Total</p>
                        <p className="font-display text-xl font-extrabold text-tinta-950">{formatarMoeda(totalCentavos)}</p>
                    </div>
                    <button onClick={lidarComFinalizacao} disabled={carregando || !tudoEscolhido} className="fw-btn-ouro px-6">
                        {carregando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                        {carregando ? 'Confirmando...' : 'Confirmar'}
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                {erro && (
                    <div className="fw-alerta-erro">
                        {erro}
                        {sugestao && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-tinta-900">
                                <span>Próximo horário com vaga para todos: <strong>{formatarDataBr(sugestao.data)} às {sugestao.horario}</strong></span>
                                <button onClick={aceitarSugestao} className="fw-btn-primario h-9 px-3 text-xs">
                                    Usar esse horário
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Local */}
                <div className="flex items-start gap-3 rounded-2xl border border-tinta-200 bg-tinta-50/70 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-marca-600 ring-1 ring-tinta-200">
                        {ehLevaTras ? <Truck size={18} /> : <MapPin size={18} />}
                    </span>
                    <div className="min-w-0">
                        <p className="fw-rotulo-secao">{ehLevaTras ? 'Buscamos em' : 'Local de atendimento'}</p>
                        <p className="mt-0.5 text-[15px] font-medium text-tinta-900">{ehLevaTras ? enderecoCliente : localLavaRapido}</p>
                        <p className="mt-0.5 text-xs text-tinta-500">
                            {ehLevaTras
                                ? (levaTras?.distancia_km != null
                                    ? `${Number(levaTras.distancia_km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km do lava-rápido · para trocar, volte ao passo anterior`
                                    : 'Para trocar o endereço, volte ao passo anterior')
                                : 'Leve o carro até o pátio no horário agendado'}
                        </p>
                    </div>
                </div>

                {/* Mesmo horário x um horário por carro */}
                {resumo.length > 1 && (
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-tinta-100 p-1">
                        {[[false, 'Mesmo horário'], [true, 'Um por carro']].map(([individual, texto]) => (
                            <button
                                key={texto}
                                type="button"
                                onClick={() => alternarModo(individual)}
                                className={`h-9 rounded-lg text-sm font-semibold transition-all ${porVeiculo === individual ? 'bg-white text-tinta-950 shadow-sm' : 'text-tinta-500 hover:text-tinta-800'}`}
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
                            <p className="mt-2 text-xs text-tinta-500">
                                Se o horário escolhido não tiver vaga para todos os carros, os demais ficam nos próximos horários do dia.
                            </p>
                        )}
                    </div>
                ) : (
                    resumo.map(item => {
                        const escolha = horariosVeiculos[item.veiculo.id] || { data, horario: null };
                        return (
                            <div key={item.veiculo.id} className="rounded-2xl border border-tinta-200 p-4">
                                <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Car size={16} className="shrink-0 text-marca-600" />
                                        <strong className="truncate text-tinta-900">{item.veiculo.marca} {item.veiculo.modelo}</strong>
                                    </span>
                                    <span className={`shrink-0 text-xs font-semibold ${escolha.horario ? 'text-marca-700' : 'text-ouro-700'}`}>
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
                <div className="rounded-2xl border border-tinta-200">
                    <p className="fw-rotulo-secao border-b border-tinta-100 px-4 py-3">Resumo do pedido</p>
                    <ul className="divide-y divide-dashed divide-tinta-200 px-4">
                        {resumo.map((item) => (
                            <li key={item.veiculo.id} className="py-3">
                                <div className="flex justify-between gap-3 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Car size={15} className="shrink-0 text-marca-600" />
                                        <strong className="truncate text-tinta-900">{item.veiculo.marca} {item.veiculo.modelo}</strong>
                                    </span>
                                    <strong className="text-tinta-900">{formatarMoeda(item.subtotalCentavos + taxaCentavos)}</strong>
                                </div>
                                <p className="mt-1 pl-6 text-xs text-tinta-500">
                                    {item.pacote?.nome}
                                    {item.extras.length > 0 && ` + ${item.extras.map(e => e.nome).join(', ')}`}
                                    {ehLevaTras && ` + leva e traz ${formatarMoeda(taxaCentavos)}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </ModalPasso>
    );
}
