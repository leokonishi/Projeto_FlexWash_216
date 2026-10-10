import React, { useState, useEffect } from 'react';
import { X, Edit, Repeat, Trash2, Car } from 'lucide-react';
import { aplicarMascaraPlaca } from '../utils/mascaras';

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
        const resVeiculos = await fetch(`${API_URL}/api/clientes/${cliente.id}/veiculos`);
        if (resVeiculos.ok) setVeiculos(await resVeiculos.json());

        // 2. Busca as Marcas diretamente da API pública da Tabela FIPE
        const resMarcas = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
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
      const resposta = await fetch(`${API_URL}/api/clientes/${cliente.id}/veiculos`, {
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
          const resposta = await fetch(`${API_URL}/api/veiculos/${veiculo.id}`, { method: 'DELETE' });
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', padding: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <Car size={24} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              Gerenciar Frota de <span style={{ color: '#3b82f6' }}>{cliente.nome.split(' ')[0]}</span>
            </h2>
          </div>
          <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.5rem' }}>VEÍCULOS REGISTRADOS</label>
          
          {carregando ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>Carregando frota...</div>
          ) : veiculos.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', background: '#f1f5f9', borderRadius: '8px' }}>
              Nenhum veículo cadastrado para este cliente.
            </div>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {veiculos.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{v.marca} {v.modelo}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      PLACA: {v.placa} • COR: {v.cor} • PORTE: {v.porte ? v.porte.toUpperCase() : 'MÉDIO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleExcluirVeiculo(v)} style={{ padding: '0.4rem', background: '#ffe4e6', border: '1px solid #fecdd3', color: '#e11d48', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '1rem' }}>CADASTRAR NOVO VEÍCULO NA FROTA</label>
          
          <div className="modal-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-cliente-grupo" style={{ marginBottom: 0 }}>
              <label>MARCA</label>
              <select value={marca} onChange={(e) => setMarca(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
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
            <div className="form-cliente-grupo" style={{ marginBottom: 0 }}>
              <label>MODELO</label>
              <input type="text" placeholder="Ex: Civic LX 2003" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
          </div>

          <div className="modal-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-cliente-grupo">
              <label>PLACA</label>
              <input type="text" placeholder="ABC1D23" value={placaInput} onChange={(e) => setPlacaInput(aplicarMascaraPlaca(e.target.value))} />
            </div>
            <div className="form-cliente-grupo">
              <label>COR</label>
              <input type="text" placeholder="Ex: Verde Vermont" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <div className="form-cliente-grupo">
              <label>PORTE</label>
              <select value={porte} onChange={(e) => setPorte(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                <option>Pequeno</option><option>Médio</option><option>Grande</option>
              </select>
            </div>
          </div>

          <button onClick={handleAdicionarVeiculo} className="btn-confirmar-cadastro" style={{ background: '#2563eb', margin: '1rem 0 0 0', width: '100%' }}>
            Adicionar Veículo
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn-cancelar" style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }} onClick={fecharModal}>
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}