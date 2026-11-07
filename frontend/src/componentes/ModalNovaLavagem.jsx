import React, { useState, useEffect } from 'react';
import { Car, Check } from 'lucide-react';
import ModalPasso, { Marcador } from './ui/ModalPasso';
import ConfiguracaoVeiculo from './ConfiguracaoVeiculo';
import { apiFetch } from '../utils/api';

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
        const res = await apiFetch(`${API_URL}/api/clientes/${clienteId}/veiculos`);
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

    // Monta o "Payload" extraindo dados de forma segura (impede crash se faltar info).
    // O valor NÃO é enviado: o servidor calcula o preço pelo pacote, extras e porte do veículo.
    // O total mostrado na tela é só uma prévia.
    const payload = {
      cliente_id: clienteId,
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

    try {
      const res = await apiFetch(`${API_URL}/api/execucoes`, {
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
              {valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <button onClick={handleConfirmar} disabled={veiculosSelecionados.length === 0} className="fw-btn-primario px-6">
            <Check size={17} /> Confirmar entrada
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="nl-cliente" className="fw-label">Cliente</label>
          <select id="nl-cliente" value={clienteId} onChange={e => setClienteId(e.target.value)} className="fw-input cursor-pointer">
            <option value="">Selecione um cliente...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome} - {c.cpf || c.telefone}</option>
            ))}
          </select>
        </div>

        {clienteId && (
          <div>
            <span className="fw-label">Carros que estão entrando</span>
            {veiculosDoCliente.length === 0 ? (
              <p className="fw-alerta-aviso">Este cliente não possui veículos cadastrados.</p>
            ) : (
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
