import React, { useState, useEffect } from 'react';
import { Trash2, Car, Plus } from 'lucide-react';
import ModalPasso from './ui/ModalPasso';
import { aplicarMascaraPlaca } from '../utils/mascaras';
import { apiFetch } from '../utils/api';

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

  const handleAdicionarVeiculo = async () => {
    if (!modelo || !placaInput || !cor) {
      abrirAlerta('Atenção', 'Preencha Modelo, Placa e Cor do veículo!', () => {}, 'aviso');
      return;
    }

    const novoVeiculo = { marca, modelo, placa: placaInput, cor, porte };

    try {
      const resposta = await apiFetch(`${API_URL}/api/clientes/${cliente.id}/veiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoVeiculo)
      });
      
      const dados = await resposta.json();

      if (resposta.ok) {
        abrirAlerta('Sucesso', 'Veículo adicionado à frota!', () => {}, 'aviso');
        setVeiculos([{ id: dados.veiculoId, ...novoVeiculo }, ...veiculos]);
        setModelo(''); setPlacaInput(''); setCor('');
        
        // REFRESH: Avisa a tela de trás (tabela de clientes) para atualizar o contador
        if (atualizarClientes) atualizarClientes();
      } else {
        abrirAlerta('Erro', dados.erro, () => {}, 'perigo');
      }
    } catch (erro) {
      abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    }
  };

  const handleExcluirVeiculo = (veiculo) => {
    abrirAlerta(
      'Remover Veículo',
      `Tem certeza que deseja remover o ${veiculo.modelo} (${veiculo.placa})?`,
      async () => {
        try {
          const resposta = await apiFetch(`${API_URL}/api/veiculos/${veiculo.id}`, { method: 'DELETE' });
          if (resposta.ok) {
            setVeiculos(veiculos.filter(v => v.id !== veiculo.id));
            
            // REFRESH: Avisa a tela de trás (tabela de clientes) para diminuir o contador
            if (atualizarClientes) atualizarClientes();
          }
        } catch (erro) {
          console.error(erro);
        }
      },
      'perigo'
    );
  };

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
                  <button onClick={() => handleExcluirVeiculo(v)} className="fw-btn-perigo" title="Remover veículo" aria-label="Remover veículo">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-tinta-200 bg-tinta-50/70 p-4">
          <p className="fw-rotulo-secao mb-3">Adicionar veículo</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="col-span-2 sm:col-span-3">
              <label className="fw-label">Marca</label>
              <select className="fw-input cursor-pointer" value={marca} onChange={(e) => setMarca(e.target.value)}>
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
          <button onClick={handleAdicionarVeiculo} className="fw-btn-primario mt-4 w-full">
            <Plus size={17} /> Adicionar veículo
          </button>
        </div>
      </div>
    </ModalPasso>
  );
}
