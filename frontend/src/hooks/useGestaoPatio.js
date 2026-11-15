import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useAtualizacaoAutomatica } from './useAtualizacaoAutomatica';

export function useGestaoPatio(abrirAlerta) {
  const [metricas, setMetricas] = useState({
    veiculosDoDia: 0, portes: { pequeno: 0, medio: 0, grande: 0 },
    faturamentoHoje: 0, statusPatio: { agendados: 0, espera: 0, emAndamento: 0 }, levaTrazTotal: 0
  });
  const [listaPatio, setListaPatio] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]); // a partir de amanhã
  const [entregas, setEntregas] = useState([]); // leva e traz com carros prontos para devolver
  const [carregando, setCarregando] = useState(true);
  const mudandoStatusRef = useRef(new Set()); // ids com mudança de status em andamento (evita clique duplo)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const alertar = (tit, msg, func, tipo) => {
    if (abrirAlerta) abrirAlerta(tit, msg, func, tipo);
    else alert(`${tit}: ${msg}`);
  };

  // silencioso: atualização automática, sem girar o botão nem trocar a tela
  const buscarDadosDoPatio = async ({ silencioso = false } = {}) => {
    try {
      if (!silencioso) setCarregando(true);
      const [resposta, respostaProximos, respostaEntregas] = await Promise.all([
        apiFetch(`${API_URL}/api/execucoes/patio`),
        apiFetch(`${API_URL}/api/execucoes/agendados`),
        apiFetch(`${API_URL}/api/execucoes/entregas`)
      ]);

      const dados = await resposta.json();
      const listaSegura = Array.isArray(dados) ? dados : [];
      const proximos = await respostaProximos.json();
      const listaEntregas = await respostaEntregas.json().catch(() => []);
      setEntregas(Array.isArray(listaEntregas) ? listaEntregas : []);

      setListaPatio(listaSegura);
      setProximosAgendamentos(Array.isArray(proximos) ? proximos : []);
      calcularMetricas(listaSegura);
      
    } catch (erro) {
      console.error("Erro ao buscar pátio:", erro);
      if (silencioso) return; // falha momentânea da atualização automática: mantém o que está na tela
      setListaPatio([]); 
      setProximosAgendamentos([]);
      calcularMetricas([]); 
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  const calcularMetricas = (dados) => {
    const dadosSeguros = Array.isArray(dados) ? dados : [];
    let faturamento = 0, pequeno = 0, medio = 0, grande = 0, emAndamento = 0, aguardando = 0, agendados = 0, levaTraz = 0;
    
    dadosSeguros.forEach(item => {
      if (item.status === 'Agendado') agendados++;
      else faturamento += Number(item.valor_total || 0); // agendado ainda não chegou: não entra na soma do pátio
      if (item.tipo_logistica === 'leva_tras') levaTraz++;
      if (item.porte === 'Pequeno' || item.porte === 'Pequena') pequeno++;
      if (item.porte === 'Médio') medio++;
      if (item.porte === 'Grande') grande++;
      if (item.status === 'Em Andamento') emAndamento++;
      if (item.status === 'Aguardando') aguardando++;
    });
    
    setMetricas({ 
      veiculosDoDia: dadosSeguros.length, 
      portes: { pequeno, medio, grande }, 
      faturamentoHoje: faturamento, 
      statusPatio: { agendados, espera: aguardando, emAndamento }, 
      levaTrazTotal: levaTraz 
    });
  };

  // funcionarios (opcional): ids da equipe, enviados ao iniciar a lavagem
  const avancarStatusServico = async (idServico, statusAtual, funcionarios) => {
    // Agendado -> Aguardando (carro chegou) -> Em Andamento -> Finalizado
    const proximoStatus = { 'Agendado': 'Aguardando', 'Aguardando': 'Em Andamento', 'Em Andamento': 'Finalizado' };
    const novoStatus = proximoStatus[statusAtual];
    if (!novoStatus || mudandoStatusRef.current.has(idServico)) return;
    mudandoStatusRef.current.add(idServico);
    try {
      const res = await apiFetch(`${API_URL}/api/execucoes/${idServico}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funcionarios ? { novoStatus, funcionarios } : { novoStatus })
      });
      if (res.ok) {
        alertar('Sucesso', `Serviço movido para: ${novoStatus}!`, () => {}, 'aviso');
      } else {
        const json = await res.json().catch(() => ({}));
        alertar('Atenção', json.erro || 'Não foi possível mudar o status.', () => {}, 'perigo');
      }
      buscarDadosDoPatio();
    } catch (erro) {
      console.error(erro);
    } finally {
      mudandoStatusRef.current.delete(idServico);
    }
  };

  // Corrige quem está lavando (muda a divisão da comissão)
  const trocarEquipe = async (idServico, funcionarios) => {
    try {
      const res = await apiFetch(`${API_URL}/api/execucoes/${idServico}/equipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionarios })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alertar('Não foi possível trocar a equipe', json.erro || 'Erro ao salvar a equipe.', () => {}, 'perigo');
      }
      buscarDadosDoPatio();
    } catch {
      alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    }
  };

  // Leva e traz: buscando / a_buscar (desfazer) / entregando / entregue
  const mudarLogistica = async (agendamentoId, etapa, motoristaId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/execucoes/agendamentos/${agendamentoId}/logistica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(motoristaId ? { etapa, motorista_id: motoristaId } : { etapa })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alertar('Atenção', json.erro || 'Não foi possível atualizar o leva e traz.', () => {}, 'perigo');
      }
      buscarDadosDoPatio({ silencioso: true });
    } catch {
      alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    }
  };

  const excluirServico = (idServico) => {
    alertar('Excluir Serviço', 'Tem a certeza que deseja remover este serviço? Ele é apagado e não vai para o histórico.', async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/execucoes/${idServico}`, { method: 'DELETE' });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alertar('Não foi possível excluir', json.erro || 'Erro ao remover o serviço.', () => {}, 'perigo');
        }
        buscarDadosDoPatio();
      } catch {
        alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
      }
    }, 'perigo');
  };

  // Agendamento que não vai acontecer: muda o status para "Cancelado" (fica registrado, sem valor no faturamento do pátio)
  const cancelarAgendamento = (item) => {
    const quem = item.cliente_nome ? ` de ${item.cliente_nome}` : '';
    alertar('Cancelar agendamento', `Cancelar o agendamento${quem} (${item.modelo || 'veículo'} ${item.placa || ''})?`, async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/execucoes/${item.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novoStatus: 'Cancelado' })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alertar('Não foi possível cancelar', json.erro || 'Erro ao cancelar o agendamento.', () => {}, 'perigo');
        }
        buscarDadosDoPatio();
      } catch {
        alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
      }
    }, 'perigo');
  };

  useEffect(() => { buscarDadosDoPatio(); }, []);
  // Pátio sempre em dia: outro funcionário mexeu, um cliente agendou para hoje, etc.
  useAtualizacaoAutomatica(() => buscarDadosDoPatio({ silencioso: true }), 20000);

  return { metricas, listaPatio, proximosAgendamentos, entregas, mudarLogistica, carregando, buscarDadosDoPatio, avancarStatusServico, trocarEquipe, excluirServico, cancelarAgendamento };
}