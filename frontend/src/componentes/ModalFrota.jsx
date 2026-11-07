import React, { useState, useEffect } from 'react';
import { Trash2, Car, Plus, Edit2, Check } from 'lucide-react';
import ModalPasso from './ui/ModalPasso';
import { aplicarMascaraPlaca } from '../utils/mascaras';
import { apiFetch } from '../utils/api';

// Usadas se a Tabela FIPE não responder
const MARCAS_RESERVA = ['Audi', 'BMW', 'Chevrolet', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jeep', 'Toyota', 'Volkswagen'];

// Adicionámos a prop 'atualizarClientes' aqui em cima
export default function ModalFrota({ cliente, fecharModal, abrirAlerta, atualizarClientes }) {
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estado para guardar as marcas vindas da API da FIPE
  const [listaMarcas, setListaMarcas] = useState([]); 

  const [marca, setMarca] = useState('Honda');
  const [modelo, setModelo] = useState('');
  const [placaInput, setPlacaInput] = useState('');
  const [cor, setCor] = useState('');
  const [porte, setPorte] = useState('Médio');
  const [editandoId, setEditandoId] = useState(null); // null = adicionando um veículo novo
  const [salvando, setSalvando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);

        // 1. Busca os veículos deste cliente no NOSSO banco de dados
        const resVeiculos = await apiFetch(`${API_URL}/api/clientes/${cliente.id}/veiculos`);
        if (resVeiculos.ok) setVeiculos(await resVeiculos.json());

        // 2. Busca as Marcas diretamente da API pública da Tabela FIPE
        const resMarcas = await apiFetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
        if (resMarcas.ok) {
          const marcasFipe = await resMarcas.json();
          if (marcasFipe.length > 0) {
            setListaMarcas(marcasFipe);
            setMarca(marcasFipe[0].nome); 
          }
        }
      } catch (erro) {
        console.error("Erro ao buscar dados do modal:", erro);
      } finally {
        setCarregando(false);
      }
    };
    
    buscarDados();
  }, [cliente.id, API_URL]);

  const limparFormulario = () => {
    setEditandoId(null);
    setModelo(''); setPlacaInput(''); setCor(''); setPorte('Médio');
    if (listaMarcas.length > 0) setMarca(listaMarcas[0].nome);
  };

  const iniciarEdicao = (veiculo) => {
    setEditandoId(veiculo.id);
    setMarca(veiculo.marca || '');
    setModelo(veiculo.modelo || '');
    setPlacaInput(veiculo.placa || '');
    setCor(veiculo.cor || '');
    setPorte(veiculo.porte || 'Médio');
  };

  // Adiciona (POST) ou salva a edição (PUT) do veículo do formulário
  const handleSalvarVeiculo = async () => {
    if (salvando) return;
    if (!modelo.trim() || !placaInput.trim() || !cor.trim()) {
      abrirAlerta('Atenção', 'Preencha Modelo, Placa e Cor do veículo!', () => {}, 'aviso');
      return;
    }

    const dadosVeiculo = { marca, modelo: modelo.trim(), placa: placaInput.trim(), cor: cor.trim(), porte };
    const editando = editandoId !== null;
    setSalvando(true);

    try {
      const resposta = await apiFetch(
        editando ? `${API_URL}/api/veiculos/${editandoId}` : `${API_URL}/api/clientes/${cliente.id}/veiculos`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosVeiculo)
        }
      );
      const dados = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        if (editando) {
          setVeiculos(prev => prev.map(v => (v.id === editandoId ? { ...v, ...dadosVeiculo, placa: dadosVeiculo.placa.toUpperCase() } : v)));
          abrirAlerta('Sucesso', 'Veículo atualizado!', () => {}, 'aviso');
        } else {
          setVeiculos(prev => [{ id: dados.veiculoId, ...dadosVeiculo }, ...prev]);
          abrirAlerta('Sucesso', 'Veículo adicionado à frota!', () => {}, 'aviso');
        }
        limparFormulario();

        // REFRESH: Avisa a tela de trás (tabela de clientes) para atualizar o contador
        if (atualizarClientes) atualizarClientes();
      } else {
        abrirAlerta('Atenção', dados.erro || 'Não foi possível salvar o veículo.', () => {}, 'perigo');
      }
    } catch {
      abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    } finally {
      setSalvando(false);
    }
  };

  // Se o veículo tiver lavagens no histórico, o servidor pede uma 2ª confirmação (só o administrador pode).
  const excluirNoServidor = async (veiculo, incluirHistorico = false) => {
    try {
      const url = `${API_URL}/api/veiculos/${veiculo.id}${incluirHistorico ? '?incluirHistorico=1' : ''}`;
      const resposta = await apiFetch(url, { method: 'DELETE' });
      const dados = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        setVeiculos(prev => prev.filter(v => v.id !== veiculo.id));
        if (editandoId === veiculo.id) limparFormulario();
        // REFRESH: Avisa a tela de trás (tabela de clientes) para diminuir o contador
        if (atualizarClientes) atualizarClientes();
        return;
      }
      if (dados.precisaConfirmarHistorico) {
        abrirAlerta(
          'Apagar também o histórico?',
          `O ${veiculo.modelo} (${veiculo.placa}) tem ${dados.historico} lavagem(ns) no histórico. Remover o veículo apaga esse histórico, e os valores saem dos relatórios. Esta ação não pode ser desfeita.`,
          () => excluirNoServidor(veiculo, true),
          'perigo'
        );
        return;
      }
      abrirAlerta('Não foi possível remover', dados.erro || 'Erro ao remover o veículo.', () => {}, 'perigo');
    } catch {
      abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    }
  };

  const handleExcluirVeiculo = (veiculo) => {
    abrirAlerta(
      'Remover Veículo',
      `Tem certeza que deseja remover o ${veiculo.modelo} (${veiculo.placa})?`,
      () => excluirNoServidor(veiculo),
      'perigo'
    );
  };

  // Garante que a marca atual (ex.: de um veículo antigo) aparece no <select>
  const marcaForaDaLista = marca && listaMarcas.length > 0 && !listaMarcas.some(m => m.nome === marca);

  return (
    <ModalPasso
      titulo={`Frota de ${cliente.nome.split(' ')[0]}`}
      subtitulo={`${veiculos.length} ${veiculos.length === 1 ? 'veículo registrado' : 'veículos registrados'}`}
      aoFechar={fecharModal}
      rodape={<div className="flex justify-end"><button className="fw-btn-contorno" onClick={fecharModal}>Fechar</button></div>}
    >
      <div className="space-y-6">
        <div>
          <p className="fw-rotulo-secao mb-2">Veículos</p>
          {carregando ? (
            <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-tinta-100" />)}</div>
          ) : veiculos.length === 0 ? (
            <p className="rounded-xl bg-tinta-50 px-4 py-6 text-center text-sm text-tinta-500">Nenhum veículo cadastrado para este cliente.</p>
          ) : (
            <ul className="space-y-2">
              {veiculos.map(v => (
                <li key={v.id} className="flex items-center gap-3 rounded-xl border border-tinta-200 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tinta-100 text-tinta-500"><Car size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta-900">{v.marca} {v.modelo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tinta-500">
                      <span className="fw-placa">{v.placa}</span>
                      <span>{v.cor}</span>
                      <span className="text-tinta-300">•</span>
                      <span>Porte {v.porte || 'Médio'}</span>
                    </div>
                  </div>
                  <button onClick={() => iniciarEdicao(v)} className={`grid size-9 shrink-0 place-items-center rounded-lg hover:bg-tinta-100 hover:text-tinta-800 ${editandoId === v.id ? 'bg-marca-50 text-marca-700' : 'text-tinta-400'}`} title="Editar veículo" aria-label={`Editar ${v.modelo}`}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleExcluirVeiculo(v)} className="fw-btn-perigo" title="Remover veículo" aria-label={`Remover ${v.modelo}`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-tinta-200 bg-tinta-50/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="fw-rotulo-secao">{editandoId !== null ? 'Editar veículo' : 'Adicionar veículo'}</p>
            {editandoId !== null && (
              <button type="button" onClick={limparFormulario} className="text-sm font-semibold text-tinta-500 hover:text-tinta-800">Cancelar edição</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="col-span-2 sm:col-span-3">
              <label className="fw-label">Marca</label>
              <select className="fw-input cursor-pointer" value={marca} onChange={(e) => setMarca(e.target.value)}>
                {listaMarcas.length > 0 ? (
                  <>
                    {marcaForaDaLista && <option value={marca}>{marca}</option>}
                    {listaMarcas.map(m => (
                      <option key={m.codigo} value={m.nome}>{m.nome}</option>
                    ))}
                  </>
                ) : (
                  <>
                    {marca && !MARCAS_RESERVA.includes(marca) && <option value={marca}>{marca}</option>}
                    <option>Audi</option><option>BMW</option><option>Chevrolet</option>
                    <option>Fiat</option><option>Ford</option><option>Honda</option>
                    <option>Hyundai</option><option>Jeep</option><option>Toyota</option>
                    <option>Volkswagen</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="fw-label">Modelo</label>
              <input className="fw-input" type="text" placeholder="Ex: Civic LX 2003" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="fw-label">Placa</label>
              <input className="fw-input font-mono uppercase" type="text" placeholder="ABC1D23" value={placaInput} onChange={(e) => setPlacaInput(aplicarMascaraPlaca(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className="fw-label">Cor</label>
              <input className="fw-input" type="text" placeholder="Ex: Prata" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label className="fw-label">Porte</label>
              <select className="fw-input cursor-pointer" value={porte} onChange={(e) => setPorte(e.target.value)}>
                <option>Pequeno</option><option>Médio</option><option>Grande</option>
              </select>
            </div>
          </div>
          <button onClick={handleSalvarVeiculo} className="fw-btn-primario mt-4 w-full" disabled={salvando}>
            {editandoId !== null ? <><Check size={17} /> Salvar alterações</> : <><Plus size={17} /> Adicionar veículo</>}
          </button>
        </div>
      </div>
    </ModalPasso>
  );
}
