import React, { useState, useEffect, useRef } from 'react';
import { Car, Check, MapPin, Truck, Loader2, UserPlus, Plus, X } from 'lucide-react';
import ModalPasso, { Marcador } from './ui/ModalPasso';
import ConfiguracaoVeiculo from './ConfiguracaoVeiculo';
import { apiFetch, API_URL } from '../utils/api';
import { aplicarMascaraCPF, aplicarMascaraTelefone, aplicarMascaraPlaca, validarContato } from '../utils/mascaras';

export default function ModalNovaLavagem({ fecharModal, abrirAlerta, atualizarPatio }) {

  // Estados de Dados da API
  const [clientes, setClientes] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  
  // Estados de Seleção do Usuário
  const [clienteId, setClienteId] = useState('');
  const [veiculosDoCliente, setVeiculosDoCliente] = useState([]);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState([]); // Array de IDs
  const [configuracoes, setConfiguracoes] = useState({}); // Guarda as configs e preços de cada veículo

  // Modalidade: o cliente trouxe o carro ou é leva e traz (busca no endereço do cliente)
  const [tipoLogistica, setTipoLogistica] = useState('cliente_leva');
  const [avaliacaoLevaTras, setAvaliacaoLevaTras] = useState(null); // resposta de /execucoes/leva-e-traz/:id
  const [verificandoLevaTras, setVerificandoLevaTras] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Trava imediata contra cliques repetidos (o estado `enviando` só muda no próximo render)
  const enviandoRef = useRef(false);

  // Cadastro rápido, sem sair do modal: cliente novo e carro novo
  const [novoCliente, setNovoCliente] = useState(null); // { nome, cpf, telefone } quando aberto
  const [novoCarro, setNovoCarro] = useState(null); // { marca, modelo, placa, cor, porte } quando aberto
  const [erroRapido, setErroRapido] = useState(null);
  const [salvandoRapido, setSalvandoRapido] = useState(false);

  const recarregarClientes = async () => {
    const res = await apiFetch(`${API_URL}/api/clientes`);
    if (res.ok) setClientes(await res.json());
  };

  const salvarNovoCliente = async () => {
    setErroRapido(null);
    if (!novoCliente.nome.trim()) return setErroRapido('Informe o nome do cliente.');
    if (!novoCliente.cpf.trim()) return setErroRapido('Informe o CPF do cliente.');
    const erroContato = validarContato(novoCliente, { telefoneObrigatorio: true });
    if (erroContato) return setErroRapido(erroContato);
    setSalvandoRapido(true);
    try {
      const res = await apiFetch(`${API_URL}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoCliente, nome: novoCliente.nome.trim() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErroRapido(json.erro || json.mensagem || 'Não foi possível cadastrar o cliente.');
      await recarregarClientes();
      setNovoCliente(null);
      if (json.id) {
        setClienteId(String(json.id));
        setNovoCarro({ marca: '', modelo: '', placa: '', cor: '', porte: 'Médio' }); // cliente novo ainda não tem carro
      }
    } catch {
      setErroRapido('Falha de conexão com o servidor.');
    } finally {
      setSalvandoRapido(false);
    }
  };

  const salvarNovoCarro = async () => {
    setErroRapido(null);
    const faltando = [['marca', 'marca'], ['modelo', 'modelo'], ['placa', 'placa'], ['cor', 'cor']]
      .filter(([c]) => !String(novoCarro[c] || '').trim()).map(([, n]) => n);
    if (faltando.length) return setErroRapido(`Preencha: ${faltando.join(', ')}.`);
    setSalvandoRapido(true);
    try {
      const dados = Object.fromEntries(Object.entries(novoCarro).map(([k, v]) => [k, String(v).trim()]));
      const res = await apiFetch(`${API_URL}/api/clientes/${clienteId}/veiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErroRapido(json.erro || json.mensagem || 'Não foi possível cadastrar o carro.');
      const lista = await apiFetch(`${API_URL}/api/clientes/${clienteId}/veiculos`);
      if (lista.ok) setVeiculosDoCliente(await lista.json());
      if (json.veiculoId) setVeiculosSelecionados((prev) => [...prev, json.veiculoId]);
      setNovoCarro(null);
    } catch {
      setErroRapido('Falha de conexão com o servidor.');
    } finally {
      setSalvandoRapido(false);
    }
  };

  // 1. Busca inicial: Clientes, Pacotes, Extras e Funcionários
  useEffect(() => {
    const buscarDadosIniciais = async () => {
      try {
        const [resClientes, resPacotes, resExtras, resFunc] = await Promise.all([
          apiFetch(`${API_URL}/api/clientes`),
          apiFetch(`${API_URL}/api/pacotes`),
          apiFetch(`${API_URL}/api/extras`),
          apiFetch(`${API_URL}/api/funcionarios`)
        ]);

        if (resClientes.ok) setClientes(await resClientes.json());
        if (resPacotes.ok) setPacotes(await resPacotes.json());
        if (resExtras.ok) setExtras(await resExtras.json());
        if (resFunc.ok) {
          // /api/funcionarios responde { sucesso, dados: [...] }
          const jsonFunc = await resFunc.json();
          const todosFunc = Array.isArray(jsonFunc) ? jsonFunc : (jsonFunc.dados || []);
          setFuncionarios(todosFunc.filter(f => f.perfil === 'funcionario' || f.perfil === 'Funcionário'));
        }
      } catch (error) {
        abrirAlerta?.('Erro', 'Falha ao carregar dados do sistema.', () => {}, 'erro');
      }
    };
    buscarDadosIniciais();
  }, []);

  // 2. Quando seleciona um cliente, busca os veículos dele
  useEffect(() => {
    setTipoLogistica('cliente_leva');
    setAvaliacaoLevaTras(null);
    if (!clienteId) {
      setVeiculosDoCliente([]);
      setVeiculosSelecionados([]);
      setConfiguracoes({});
      return;
    }

    // Leva e traz: mede a distância até o endereço do cliente (mesma regra do agendamento)
    let cancelado = false;
    const verificarLevaTras = async () => {
      setVerificandoLevaTras(true);
      try {
        const res = await apiFetch(`${API_URL}/api/execucoes/leva-e-traz/${clienteId}`);
        const json = await res.json().catch(() => ({}));
        if (!cancelado) {
          setAvaliacaoLevaTras(res.ok ? json : { disponivel: false, mensagem: json.erro || 'Não foi possível verificar o leva e traz.' });
        }
      } catch {
        if (!cancelado) setAvaliacaoLevaTras({ disponivel: false, mensagem: 'Falha de conexão ao verificar o leva e traz.' });
      } finally {
        if (!cancelado) setVerificandoLevaTras(false);
      }
    };
    verificarLevaTras();

    const buscarVeiculos = async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/clientes/${clienteId}/veiculos`);
        if (res.ok) setVeiculosDoCliente(await res.json());
      } catch (error) {
        console.error(error);
      }
    };
    buscarVeiculos();
    return () => { cancelado = true; };
  }, [clienteId]);

  // Função disparada quando marcamos/desmarcamos a checkbox de um carro
  const toggleVeiculo = (id) => {
    setVeiculosSelecionados(prev => {
      if (prev.includes(id)) {
        const novasConfigs = { ...configuracoes };
        delete novasConfigs[id];
        setConfiguracoes(novasConfigs);
        return prev.filter(v => v !== id);
      }
      return [...prev, id];
    });
  };

  // Recebe os dados do componente filho e atualiza o estado central
  const handleAtualizarConfig = (idVeiculo, dados) => {
    setConfiguracoes(prev => ({
      ...prev,
      [idVeiculo]: dados
    }));
  };

  // Calcula o valor total de todos os carros selecionados
  const levaTrasDisponivel = Boolean(avaliacaoLevaTras?.disponivel) && !verificandoLevaTras;
  const taxaLevaTras = levaTrasDisponivel ? Number(avaliacaoLevaTras.taxa_por_veiculo || 0) : 0;
  const totalLevaTras = tipoLogistica === 'leva_tras' ? taxaLevaTras * veiculosSelecionados.length : 0;
  const valorTotalGeral = Object.values(configuracoes).reduce((acc, curr) => acc + (curr.valor_total || 0), 0) + totalLevaTras;
  const moeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Campos obrigatórios: cliente, pelo menos um carro, o pacote de cada carro e,
  // no leva e traz, o endereço do cliente dentro do raio.
  const carrosSemPacote = veiculosSelecionados
    .filter(vId => !configuracoes[vId]?.pacote_id)
    .map(vId => veiculosDoCliente.find(v => v.id === vId))
    .filter(Boolean);
  let pendencia = null;
  if (!clienteId) pendencia = 'Selecione o cliente.';
  else if (veiculosSelecionados.length === 0) pendencia = 'Selecione pelo menos um veículo.';
  else if (carrosSemPacote.length > 0) {
    pendencia = `Escolha o pacote de: ${carrosSemPacote.map(v => `${v.marca} ${v.modelo}`).join(', ')}.`;
  } else if (tipoLogistica === 'leva_tras' && !levaTrasDisponivel) {
    pendencia = avaliacaoLevaTras?.endereco_cliente
      ? 'O leva e traz não está disponível para este cliente.'
      : 'O cliente não tem endereço cadastrado para o leva e traz.';
  }

  // 3. ENVIAR PARA O BANCO DE DADOS (POST) - Versão Blindada
  const handleConfirmar = async () => {
    if (enviandoRef.current) return;
    if (pendencia) {
      abrirAlerta?.('Atenção', pendencia, () => {}, 'info');
      return;
    }

    // Monta o "Payload" extraindo dados de forma segura (impede crash se faltar info).
    // O valor NÃO é enviado: o servidor calcula o preço pelo pacote, extras e porte do veículo.
    // O total mostrado na tela é só uma prévia.
    const payload = {
      cliente_id: clienteId,
      tipo_logistica: tipoLogistica,
      veiculos: veiculosSelecionados.map(vId => {
        const config = configuracoes[vId] || {};
        return {
          veiculo_id: vId,
          pacote_id: config.pacote_id || null,
          extras: config.extras || [],
          funcionarios: config.funcionarios || []
        };
      })
    };

    enviandoRef.current = true;
    setEnviando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/execucoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        abrirAlerta?.('Sucesso', 'Serviço iniciado no pátio!', () => {}, 'sucesso');
        
        if (atualizarPatio) atualizarPatio(); // Recarrega a tabela do pátio
        fecharModal();
      } else {
        const erroData = await res.json();
        abrirAlerta?.('Erro', erroData.erro || 'Falha ao iniciar.', () => {}, 'erro');
      }
    } catch (error) {
      console.error(error);
      abrirAlerta?.('Erro', 'Falha de conexão com o servidor.', () => {}, 'erro');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  // Situação do leva e traz embaixo do título da opção
  let situacaoLevaTras;
  if (verificandoLevaTras) situacaoLevaTras = { cor: 'text-tinta-500', texto: 'Calculando a distância até o endereço do cliente...' };
  else if (levaTrasDisponivel) {
    situacaoLevaTras = {
      cor: 'text-verde-700',
      texto: taxaLevaTras === 0 ? 'Grátis' : `+ ${moeda(taxaLevaTras)} por veículo`
    };
  } else situacaoLevaTras = { cor: 'text-red-600', texto: avaliacaoLevaTras?.mensagem || 'Indisponível para este cliente' };

  const opcaoModalidade = (tipo, Icone, titulo, descricao, extra, habilitada = true) => {
    const ativo = tipoLogistica === tipo;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={ativo}
        disabled={!habilitada}
        data-ativo={ativo}
        onClick={() => setTipoLogistica(tipo)}
        className="fw-opcao items-start disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${ativo ? 'bg-marca-600 text-white' : 'bg-tinta-100 text-tinta-500'}`}>
          <Icone size={18} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-semibold text-tinta-900">{titulo}</span>
          <span className="block text-xs text-tinta-500">{descricao}</span>
          {extra}
        </span>
        <Marcador ativo={ativo} redondo />
      </button>
    );
  };

  return (
    <ModalPasso
      titulo="Nova entrada no pátio"
      subtitulo="Escolha o cliente, os carros e o serviço de cada um."
      largura="sm:max-w-3xl"
      aoFechar={fecharModal}
      rodape={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-tinta-500">
              Total · {veiculosSelecionados.length} {veiculosSelecionados.length === 1 ? 'carro' : 'carros'}
            </p>
            <p className="font-display text-xl font-extrabold text-tinta-950">
              {moeda(valorTotalGeral)}
            </p>
            {pendencia && clienteId && veiculosSelecionados.length > 0 && (
              <p className="mt-0.5 text-xs font-medium text-red-600">{pendencia}</p>
            )}
          </div>
          <button
            onClick={handleConfirmar}
            disabled={Boolean(pendencia) || enviando}
            title={pendencia || undefined}
            className="fw-btn-primario px-6"
          >
            {enviando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} {enviando ? 'Registrando...' : 'Confirmar entrada'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="nl-cliente" className="fw-label">Cliente</label>
            {!novoCliente && (
              <button type="button" onClick={() => { setErroRapido(null); setNovoCarro(null); setNovoCliente({ nome: '', cpf: '', telefone: '' }); }}
                className="-mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-marca-600 hover:bg-marca-50">
                <UserPlus size={14} /> Cliente novo
              </button>
            )}
          </div>
          {novoCliente ? (
            <div className="space-y-3 rounded-2xl bg-tinta-50 p-4 ring-1 ring-tinta-200">
              {erroRapido && <p className="fw-alerta-erro">{erroRapido}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="fw-input" placeholder="Nome" aria-label="Nome do cliente" autoFocus value={novoCliente.nome}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, nome: e.target.value }))} />
                <input className="fw-input" placeholder="CPF" aria-label="CPF" inputMode="numeric" value={novoCliente.cpf}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, cpf: aplicarMascaraCPF(e.target.value) }))} />
                <input className="fw-input" placeholder="Telefone" aria-label="Telefone" inputMode="tel" value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente((c) => ({ ...c, telefone: aplicarMascaraTelefone(e.target.value) }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="fw-btn-contorno h-9" onClick={() => setNovoCliente(null)}>Voltar</button>
                <button type="button" className="fw-btn-primario h-9" disabled={salvandoRapido} onClick={salvarNovoCliente}>
                  {salvandoRapido ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Cadastrar cliente
                </button>
              </div>
            </div>
          ) : (
            <select id="nl-cliente" value={clienteId} onChange={e => { setNovoCarro(null); setClienteId(e.target.value); }} className="fw-input cursor-pointer">
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} - {c.cpf || c.telefone}</option>
              ))}
            </select>
          )}
        </div>

        {clienteId && (
          <div>
            <span className="fw-label">Carros que estão entrando</span>
            {veiculosDoCliente.length === 0 && !novoCarro ? (
              <p className="fw-alerta-aviso">Este cliente ainda não tem carro cadastrado. Use "Adicionar carro" abaixo.</p>
            ) : veiculosDoCliente.length === 0 ? null : (
              <div className="grid gap-2 sm:grid-cols-2">
                {veiculosDoCliente.map(v => {
                  const ativo = veiculosSelecionados.includes(v.id);
                  return (
                    <button type="button" key={v.id} data-ativo={ativo} onClick={() => toggleVeiculo(v.id)} className="fw-opcao">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${ativo ? 'bg-marca-600 text-white' : 'bg-tinta-100 text-tinta-500'}`}>
                        <Car size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-tinta-900">{v.marca} {v.modelo}</span>
                        <span className="block text-xs text-tinta-500"><span className="font-mono uppercase">{v.placa}</span> · Porte {v.porte}</span>
                      </span>
                      <Marcador ativo={ativo} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {clienteId && (
          novoCarro ? (
            <div className="-mt-3 space-y-3 rounded-2xl bg-tinta-50 p-4 ring-1 ring-tinta-200">
              <p className="text-sm font-semibold text-tinta-800">Carro novo</p>
              {erroRapido && <p className="fw-alerta-erro">{erroRapido}</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <input className="fw-input" placeholder="Marca" aria-label="Marca" value={novoCarro.marca}
                  onChange={(e) => setNovoCarro((c) => ({ ...c, marca: e.target.value }))} />
                <input className="fw-input" placeholder="Modelo" aria-label="Modelo" value={novoCarro.modelo}
                  onChange={(e) => setNovoCarro((c) => ({ ...c, modelo: e.target.value }))} />
                <input className="fw-input font-mono uppercase" placeholder="Placa" aria-label="Placa" value={novoCarro.placa}
                  onChange={(e) => setNovoCarro((c) => ({ ...c, placa: aplicarMascaraPlaca(e.target.value) }))} />
                <input className="fw-input" placeholder="Cor" aria-label="Cor" value={novoCarro.cor}
                  onChange={(e) => setNovoCarro((c) => ({ ...c, cor: e.target.value }))} />
                <select className="fw-input cursor-pointer" aria-label="Porte" value={novoCarro.porte}
                  onChange={(e) => setNovoCarro((c) => ({ ...c, porte: e.target.value }))}>
                  <option value="Pequeno">Pequeno</option><option value="Médio">Médio</option><option value="Grande">Grande</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="fw-btn-contorno h-9" onClick={() => { setErroRapido(null); setNovoCarro(null); }}><X size={15} /> Fechar</button>
                <button type="button" className="fw-btn-primario h-9" disabled={salvandoRapido} onClick={salvarNovoCarro}>
                  {salvandoRapido ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Adicionar carro
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setErroRapido(null); setNovoCarro({ marca: '', modelo: '', placa: '', cor: '', porte: 'Médio' }); }}
              className="-mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-marca-600 hover:bg-marca-50">
              <Plus size={14} /> Adicionar carro
            </button>
          )
        )}

        {clienteId && (
          <div>
            <span className="fw-label">Como o carro chega</span>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {opcaoModalidade('cliente_leva', MapPin, 'Cliente trouxe o carro', 'O carro já está aqui no pátio.')}
              {opcaoModalidade(
                'leva_tras',
                Truck,
                'Leva e traz',
                avaliacaoLevaTras?.endereco_cliente || 'A equipe busca e devolve no endereço do cliente.',
                <span className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${situacaoLevaTras.cor}`}>
                  {verificandoLevaTras && <Loader2 size={12} className="animate-spin" />}
                  {situacaoLevaTras.texto}
                </span>,
                levaTrasDisponivel
              )}
            </div>
          </div>
        )}

        {veiculosSelecionados.length > 0 && (
          <div className="space-y-4">
            <p className="fw-rotulo-secao">Serviço de cada carro</p>
            {veiculosSelecionados.map(vId => {
              const veiculo = veiculosDoCliente.find(v => v.id === vId);
              return (
                <ConfiguracaoVeiculo
                  key={vId}
                  veiculo={veiculo}
                  pacotes={pacotes}
                  extras={extras}
                  funcionarios={funcionarios}
                  onAtualizar={handleAtualizarConfig}
                />
              );
            })}
          </div>
        )}
      </div>
    </ModalPasso>
  );
}
