import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';

export function useGestaoPatio(abrirAlerta) {
  const [metricas, setMetricas] = useState({
    veiculosDoDia: 0, portes: { pequeno: 0, medio: 0, grande: 0 },
    faturamentoHoje: 0, statusPatio: { agendados: 0, espera: 0, emAndamento: 0 }, levaTrazTotal: 0
  });
  const [listaPatio, setListaPatio] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]); // a partir de amanhã
  const [carregando, setCarregando] = useState(true);
  const mudandoStatusRef = useRef(new Set()); // ids com mudança de status em andamento (evita clique duplo)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const alertar = (tit, msg, func, tipo) => {
    if (abrirAlerta) abrirAlerta(tit, msg, func, tipo);
    else alert(`${tit}: ${msg}`);
  };

  const buscarDadosDoPatio = async () => {
    try {
      setCarregando(true);
      const [resposta, respostaProximos] = await Promise.all([
        apiFetch(`${API_URL}/api/execucoes/patio`),
        apiFetch(`${API_URL}/api/execucoes/agendados`)
      ]);

      const dados = await resposta.json();
      const listaSegura = Array.isArray(dados) ? dados : [];
      const proximos = await respostaProximos.json();

      setListaPatio(listaSegura);
      setProximosAgendamentos(Array.isArray(proximos) ? proximos : []);
      calcularMetricas(listaSegura);
      
    } catch (erro) {
      console.error("Erro ao buscar pátio:", erro);
      setListaPatio([]); 
      setProximosAgendamentos([]);
      calcularMetricas([]); 
    } finally {
      setCarregando(false);
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

  const avancarStatusServico = async (idServico, statusAtual) => {
    // Agendado -> Aguardando (carro chegou) -> Em Andamento -> Finalizado
    const proximoStatus = { 'Agendado': 'Aguardando', 'Aguardando': 'Em Andamento', 'Em Andamento': 'Finalizado' };
    const novoStatus = proximoStatus[statusAtual];
    if (!novoStatus || mudandoStatusRef.current.has(idServico)) return;
    mudandoStatusRef.current.add(idServico);
    try {
      const res = await apiFetch(`${API_URL}/api/execucoes/${idServico}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus })
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

  return { metricas, listaPatio, proximosAgendamentos, carregando, buscarDadosDoPatio, avancarStatusServico, excluirServico, cancelarAgendamento };
}