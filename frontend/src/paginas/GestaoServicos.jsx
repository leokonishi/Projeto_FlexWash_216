import React, { useState, useEffect } from 'react';
import '../paginas_css/gestao_servicos.css';

export default function GestaoServicos() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  
  // Controle de edição
  const [editandoId, setEditandoId] = useState(null);

  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    preco_base: '',
    duracao_estimada: '',
    ativo: true
  });

  useEffect(() => {
    buscarServicos();
  }, []);

  async function buscarServicos() {
    try {
      const resposta = await fetch(`${API_URL}/api/servicos`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });
      const json = await resposta.json();
      if (resposta.ok) setServicos(json.dados || []);
    } catch (erro) {
      console.error('Erro ao buscar servicos:', erro);
    } finally {
      setCarregando(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const prepararEdicao = (servico) => {
    setEditandoId(servico.id);
    setFormulario({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco_base: servico.preco_base,
      duracao_estimada: servico.duracao_estimada,
      ativo: Boolean(servico.ativo)
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormulario({ nome: '', descricao: '', preco_base: '', duracao_estimada: '', ativo: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    const metodo = editandoId ? 'PUT' : 'POST';
    const url = editandoId ? `${API_URL}/api/servicos/${editandoId}` : `${API_URL}/api/servicos`;

    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}`
        },
        body: JSON.stringify(formulario)
      });

      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao salvar servico');

      if (editandoId) {
        setServicos((prev) => prev.map((s) => (s.id === editandoId ? json.dados : s)));
        alert('Servico atualizado com sucesso!');
      } else {
        setServicos((prev) => [...prev, json.dados]);
        alert('Servico cadastrado com sucesso!');
      }
      
      cancelarEdicao();
    } catch (erro) {
      alert(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleToggleAtivo = async (servico) => {
    // 1. Alerta de Confirmação antes de fazer qualquer coisa
    const acaoDesejada = servico.ativo ? 'DESATIVAR' : 'REATIVAR';
    const confirmou = window.confirm(`Tem certeza que deseja ${acaoDesejada} o serviço "${servico.nome}"? \n\nEle ${servico.ativo ? 'não aparecerá mais' : 'voltará a aparecer'} nas opções de novas lavagens.`);
    
    // Se o usuário clicou em "Cancelar", paramos a função aqui
    if (!confirmou) return; 

    const novoStatus = !servico.ativo;
    
    try {
      const resposta = await fetch(`${API_URL}/api/servicos/${servico.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}`
        },
        body: JSON.stringify({ ...servico, ativo: novoStatus })
      });
      
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao alterar status');
      
      // Atualiza a tabela com o novo status
      setServicos((prev) => prev.map((s) => (s.id === servico.id ? json.dados : s)));
      
      // 2. Alerta de Sucesso após a conclusão
      alert(`Serviço ${servico.ativo ? 'desativado' : 'reativado'} com sucesso!`);
      
    } catch (erro) {
      alert(`Erro: ${erro.message}`);
    }
  };

  const servicosFiltrados = servicos.filter((s) =>
    s.nome.toLowerCase().includes(filtroNome.toLowerCase())
  );

  return (
    <div className="gs-grid-container">
      <div className="gs-card-formulario">
        <h2 className="gs-titulo-card">{editandoId ? 'Editar Servico' : 'Novo Servico'}</h2>
        <p className="gs-subtitulo-card">
          {editandoId ? 'Altere as informacoes deste servico.' : 'Cadastre um novo tipo de lavagem ou estetica no catalogo.'}
        </p>

        <form onSubmit={handleSubmit} className="gs-form">
          <div className="gs-form-group">
            <label>NOME DO SERVICO</label>
            <input type="text" name="nome" placeholder="Ex: Lavagem Completa" value={formulario.nome} onChange={handleInputChange} required />
          </div>
          <div className="gs-form-group">
            <label>DESCRICAO (Opcional)</label>
            <textarea name="descricao" placeholder="Detalhes do servico..." value={formulario.descricao} onChange={handleInputChange} rows="3" />
          </div>
          <div className="gs-form-row-dupla">
            <div className="gs-form-group">
              <label>PRECO BASE (R$)</label>
              <input type="number" name="preco_base" placeholder="0.00" min="0" step="0.01" value={formulario.preco_base} onChange={handleInputChange} required />
            </div>
            <div className="gs-form-group">
              <label>DURACAO (Minutos)</label>
              <input type="number" name="duracao_estimada" placeholder="Ex: 60" min="0" value={formulario.duracao_estimada} onChange={handleInputChange} required />
            </div>
          </div>

          <button type="submit" className="gs-btn-confirmar" disabled={enviando}>
            {enviando ? 'Salvando...' : (editandoId ? 'Salvar Alteracoes' : 'Salvar Servico')}
          </button>
          
          {editandoId && (
            <button type="button" className="gs-btn-cancelar" onClick={cancelarEdicao} disabled={enviando}>
              Cancelar Edicao
            </button>
          )}
        </form>
      </div>

      <div className="gs-card-listagem">
        <h2 className="gs-titulo-card">Catalogo de Servicos</h2>
        <p className="gs-subtitulo-card">Gerencie os servicos disponiveis, precos e tempo estimado.</p>
        <div className="gs-barra-filtros">
          <div className="gs-filtro-item">
            <label>BUSCAR SERVICO</label>
            <input type="text" placeholder="Digite o nome do servico..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} />
          </div>
        </div>

        <div className="gs-tabela-wrapper">
          {carregando ? (
            <div className="gs-aviso-vazio">Carregando catalogo...</div>
          ) : (
            <table className="gs-tabela">
              <thead>
                <tr>
                  <th>SERVICO</th>
                  <th>DURACAO</th>
                  <th>PRECO BASE</th>
                  <th>STATUS</th>
                  <th>ACOES</th>
                </tr>
              </thead>
              <tbody>
                {servicosFiltrados.length === 0 ? (
                  <tr><td colSpan="5" className="gs-aviso-vazio">Nenhum servico encontrado.</td></tr>
                ) : (
                  servicosFiltrados.map((servico) => (
                    <tr key={servico.id}>
                      <td>
                        <strong>{servico.nome}</strong>
                        {servico.descricao && <div className="gs-desc-sub">{servico.descricao}</div>}
                      </td>
                      <td>{servico.duracao_estimada} min</td>
                      <td className="gs-valor-destaque">R$ {Number(servico.preco_base).toFixed(2).replace('.', ',')}</td>
                      <td>
                        <span className={servico.ativo ? 'gs-badge-ativo' : 'gs-badge-inativo'}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="gs-acoes-flex">
                          <button type="button" className="gs-btn-editar" onClick={() => prepararEdicao(servico)}>Editar</button>
                          <button type="button" className="gs-btn-toggle" onClick={() => handleToggleAtivo(servico)}>
                            {servico.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}