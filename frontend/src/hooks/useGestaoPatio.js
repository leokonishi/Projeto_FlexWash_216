import { useState, useEffect } from 'react';

export function useGestaoPatio(abrirAlerta) {
  const [metricas, setMetricas] = useState({
    veiculosDoDia: 0, portes: { pequeno: 0, medio: 0, grande: 0 },
    faturamentoHoje: 0, statusPatio: { espera: 0, emAndamento: 0 }, levaTrazTotal: 0
  });
  const [listaPatio, setListaPatio] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const alertar = (tit, msg, func, tipo) => {
    if (abrirAlerta) abrirAlerta(tit, msg, func, tipo);
    else alert(`${tit}: ${msg}`);
  };

  const buscarDadosDoPatio = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/api/execucoes/patio`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });
      
      const dados = await resposta.json();
      const listaSegura = Array.isArray(dados) ? dados : [];
      
      setListaPatio(listaSegura);
      calcularMetricas(listaSegura);
      
    } catch (erro) {
      console.error("Erro ao buscar pátio:", erro);
      setListaPatio([]); 
      calcularMetricas([]); 
    } finally {
      setCarregando(false);
    }
  };

  const calcularMetricas = (dados) => {
    const dadosSeguros = Array.isArray(dados) ? dados : [];
    let faturamento = 0, pequeno = 0, medio = 0, grande = 0, emAndamento = 0, aguardando = 0;
    
    dadosSeguros.forEach(item => {
      faturamento += Number(item.valor_total || 0);
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
      statusPatio: { espera: aguardando, emAndamento }, 
      levaTrazTotal: 0 
    });
  };

  const avancarStatusServico = async (idServico, statusAtual) => {
    const novoStatus = statusAtual === 'Aguardando' ? 'Em Andamento' : 'Finalizado';
    try {
      const res = await fetch(`${API_URL}/api/execucoes/${idServico}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus })
      });
      if (res.ok) {
        alertar('Sucesso', `Serviço movido para: ${novoStatus}!`, () => {}, 'aviso');
        buscarDadosDoPatio();
      }
    } catch (erro) {
      console.error(erro);
    }
  };

  const excluirServico = (idServico) => {
    alertar('Excluir Serviço', 'Tem a certeza que deseja remover este veículo do pátio?', async () => {
      try {
        const res = await fetch(`${API_URL}/api/execucoes/${idServico}`, { method: 'DELETE' });
        if (res.ok) buscarDadosDoPatio();
      } catch (erro) {
        console.error(erro);
      }
    }, 'perigo');
  };

  useEffect(() => { buscarDadosDoPatio(); }, []);

  return { metricas, listaPatio, carregando, buscarDadosDoPatio, avancarStatusServico, excluirServico };
}