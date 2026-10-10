import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ConfiguracaoVeiculo from './ConfiguracaoVeiculo';

export default function ModalNovaLavagem({ fecharModal, abrirAlerta, atualizarPatio }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

  // 1. Busca inicial: Clientes, Pacotes, Extras e Funcionários
  useEffect(() => {
    const buscarDadosIniciais = async () => {
      try {
        const [resClientes, resPacotes, resExtras, resFunc] = await Promise.all([
          fetch(`${API_URL}/api/clientes`),
          fetch(`${API_URL}/api/pacotes`),
          fetch(`${API_URL}/api/extras`),
          fetch(`${API_URL}/api/funcionarios`)
        ]);

        if (resClientes.ok) setClientes(await resClientes.json());
        if (resPacotes.ok) setPacotes(await resPacotes.json());
        if (resExtras.ok) setExtras(await resExtras.json());
        if (resFunc.ok) {
          const todosFunc = await resFunc.json();
          setFuncionarios(todosFunc.filter(f => f.perfil === 'funcionario' || f.perfil === 'Funcionário'));
        }
      } catch (error) {
        if(abrirAlerta) abrirAlerta('Erro', 'Falha ao carregar dados do sistema.', () => {}, 'perigo');
      }
    };
    buscarDadosIniciais();
  }, []);

  // 2. Quando seleciona um cliente, busca os veículos dele
  useEffect(() => {
    if (!clienteId) {
      setVeiculosDoCliente([]);
      setVeiculosSelecionados([]);
      setConfiguracoes({});
      return;
    }

    const buscarVeiculos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/clientes/${clienteId}/veiculos`);
        if (res.ok) setVeiculosDoCliente(await res.json());
      } catch (error) {
        console.error(error);
      }
    };
    buscarVeiculos();
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
  const valorTotalGeral = Object.values(configuracoes).reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

  // 3. ENVIAR PARA O BANCO DE DADOS (POST) - Versão Blindada
  const handleConfirmar = async () => {
    if (veiculosSelecionados.length === 0) {
      if(abrirAlerta) abrirAlerta('Atenção', 'Selecione pelo menos um veículo.', () => {}, 'aviso');
      else alert('Selecione pelo menos um veículo.');
      return;
    }

    // Monta o "Payload" extraindo dados de forma segura (impede crash se faltar info)
    const payload = {
      cliente_id: clienteId,
      veiculos: veiculosSelecionados.map(vId => {
        const config = configuracoes[vId] || {};
        return {
          veiculo_id: vId,
          pacote_id: config.pacote_id || null,
          extras: config.extras || [],
          funcionarios: config.funcionarios || [],
          valor_total: config.valor_total || 0
        };
      })
    };

    console.log("Enviando para o Banco:", payload); // Para você acompanhar no F12

    try {
      const res = await fetch(`${API_URL}/api/execucoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if(abrirAlerta) abrirAlerta('Sucesso', 'Serviço iniciado no pátio!', () => {}, 'aviso');
        else alert('Serviço iniciado no pátio com sucesso!');
        
        if (atualizarPatio) atualizarPatio(); // Recarrega a tabela do pátio
        fecharModal();
      } else {
        const erroData = await res.json();
        if(abrirAlerta) abrirAlerta('Erro', erroData.erro || 'Falha ao iniciar.', () => {}, 'perigo');
        else alert(erroData.erro || 'Falha ao iniciar.');
      }
    } catch (error) {
      console.error(error);
      if(abrirAlerta) abrirAlerta('Erro', 'Falha de conexão com o servidor.', () => {}, 'perigo');
      else alert('Falha de conexão com o servidor.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header Fixo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Iniciar Entrada de Veículos</h2>
          <button onClick={fecharModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X /></button>
        </div>

        {/* Corpo Rolável */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem' }}>CLIENTE ASSOCIADO</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} - {c.cpf || c.telefone}</option>
              ))}
            </select>
          </div>

          {clienteId && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem' }}>SELECIONE OS VEÍCULOS PARA ENTRADA</label>
              
              {veiculosDoCliente.length === 0 ? (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Este cliente não possui veículos cadastrados.</p>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {veiculosDoCliente.map(v => (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: veiculosSelecionados.includes(v.id) ? '#eff6ff' : 'white' }}>
                      <input type="checkbox" checked={veiculosSelecionados.includes(v.id)} onChange={() => toggleVeiculo(v.id)} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{v.marca} {v.modelo}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.placa} • {v.porte}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {veiculosSelecionados.length > 0 && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '1rem' }}>Configurações Individuais de Serviços por Carro</h3>
              
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

        {/* Extrato e Footer Fixos no Bottom */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a' }}>EXTRATO CONSOLIDADO</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Detalhamento dos valores que entrarão no pátio.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Valor Total Geral</span>
              <strong style={{ fontSize: '1.5rem', color: '#2563eb' }}>R$ {valorTotalGeral.toFixed(2)}</strong>
            </div>
          </div>
          
          <button 
            onClick={handleConfirmar}
            disabled={veiculosSelecionados.length === 0}
            style={{ width: '100%', padding: '1rem', background: veiculosSelecionados.length === 0 ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: veiculosSelecionados.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            Confirmar Entrada Geral
          </button>
        </div>

      </div>
    </div>
  );
}