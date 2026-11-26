import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_URL } from '../utils/api';
import { useAtualizacaoAutomatica } from './useAtualizacaoAutomatica';

// Texto do aviso depois de mover um carro no pátio
const MENSAGEM_STATUS = {
  'Aguardando': 'Carro na fila.',
  'Em Andamento': 'Lavagem iniciada.',
  'Finalizado': 'Carro pronto!',
};

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


  const alertar = (tit, msg, func, tipo) => abrirAlerta?.(tit, msg, func, tipo);

  // silencioso: atualização automática, sem girar o botão nem trocar a tela
  const buscarDadosDoPatio = async ({ silencioso = false } = {}) => {
    try {
      if (!silencioso) setCarregando(true);
      const [resposta, respostaProximos, respostaEntregas, respostaConcluidos] = await Promise.all([
        apiFetch(`${API_URL}/api/execucoes/patio`),
        apiFetch(`${API_URL}/api/execucoes/agendados`),
        apiFetch(`${API_URL}/api/execucoes/entregas`),
        apiFetch(`${API_URL}/api/execucoes/concluidos-hoje`).catch(() => null)
      ]);

      const dados = await resposta.json();
      const listaSegura = Array.isArray(dados) ? dados : [];
      const proximos = await respostaProximos.json();
      const listaEntregas = await respostaEntregas.json().catch(() => []);
      setEntregas(Array.isArray(listaEntregas) ? listaEntregas : []);

      setListaPatio(listaSegura);
      setProximosAgendamentos(Array.isArray(proximos) ? proximos : []);
      const concluidos = respostaConcluidos?.ok ? await respostaConcluidos.json().catch(() => []) : [];
      calcularMetricas(listaSegura, Array.isArray(concluidos) ? concluidos : []);
      
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

  // concluidosHoje: carros finalizados hoje (já saíram do pátio), para os totais do dia não zerarem
  const calcularMetricas = (dados, concluidosHoje = []) => {
    const dadosSeguros = Array.isArray(dados) ? dados : [];
    let faturamento = 0, pequeno = 0, medio = 0, grande = 0, emAndamento = 0, aguardando = 0, agendados = 0, levaTraz = 0;
    const contarPorte = (porte) => {
      if (porte === 'Pequeno' || porte === 'Pequena') pequeno++;
      if (porte === 'Médio') medio++;
      if (porte === 'Grande') grande++;
    };
    concluidosHoje.forEach(item => {
      faturamento += Number(item.valor_total || 0);
      contarPorte(item.porte);
    });
    
    dadosSeguros.forEach(item => {
      if (item.status === 'Agendado') agendados++;
      else faturamento += Number(item.valor_total || 0); // agendado ainda não chegou: não entra na soma do pátio
      if (item.tipo_logistica === 'leva_tras') levaTraz++;
      contarPorte(item.porte);
      if (item.status === 'Em Andamento') emAndamento++;
      if (item.status === 'Aguardando') aguardando++;
    });
    
    setMetricas({ 
      veiculosDoDia: dadosSeguros.length + concluidosHoje.length, 
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
        alertar('Sucesso', MENSAGEM_STATUS[novoStatus] || `Serviço movido para: ${novoStatus}`, () => {}, 'sucesso');
      } else {
        const json = await res.json().catch(() => ({}));
        alertar('Atenção', json.erro || 'Não foi possível mudar o status.', () => {}, 'erro');
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
        alertar('Não foi possível trocar a equipe', json.erro || 'Erro ao salvar a equipe.', () => {}, 'erro');
      }
      buscarDadosDoPatio();
    } catch {
      alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'erro');
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
        alertar('Atenção', json.erro || 'Não foi possível atualizar o leva e traz.', () => {}, 'erro');
      }
      buscarDadosDoPatio({ silencioso: true });
    } catch {
      alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'erro');
    }
  };

  const excluirServico = (idServico) => {
    alertar('Excluir Serviço', 'Tem a certeza que deseja remover este serviço? Ele é apagado e não vai para o histórico.', async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/execucoes/${idServico}`, { method: 'DELETE' });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alertar('Não foi possível excluir', json.erro || 'Erro ao remover o serviço.', () => {}, 'erro');
        }
        buscarDadosDoPatio();
      } catch {
        alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'erro');
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
          alertar('Não foi possível cancelar', json.erro || 'Erro ao cancelar o agendamento.', () => {}, 'erro');
        }
        buscarDadosDoPatio();
      } catch {
        alertar('Erro', 'Falha ao conectar com o servidor.', () => {}, 'erro');
      }
    }, 'perigo');
  };

  // Cliente chegou antes do dia marcado (agendamento de outro dia): confirma e dá entrada já.
  // O backend passa o serviço para hoje e libera o horário que estava reservado.
  const receberAntecipado = (item, quando) => {
    const carro = `${item.marca || ''} ${item.modelo || 'veículo'} (${item.placa || ''})`.trim();
    const marcado = quando ? ` estava marcado para ${quando.data} às ${quando.hora}` : ' é de outro dia';
    alertar(
      'Dar entrada antes do horário',
      `O ${carro}${marcado}. Dar entrada no pátio agora? O horário reservado fica livre na agenda.`,
      () => avancarStatusServico(item.id, 'Agendado')
    );
  };

  useEffect(() => { buscarDadosDoPatio(); }, []);
  // Pátio sempre em dia: outro funcionário mexeu, um cliente agendou para hoje, etc.
  useAtualizacaoAutomatica(() => buscarDadosDoPatio({ silencioso: true }), 20000);

  return { metricas, listaPatio, proximosAgendamentos, entregas, mudarLogistica, carregando, buscarDadosDoPatio, avancarStatusServico, trocarEquipe, excluirServico, cancelarAgendamento, receberAntecipado };
}