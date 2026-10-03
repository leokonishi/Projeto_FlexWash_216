import React, { useState, useEffect } from 'react';
import '../paginas_css/gestao_funcionarios.css';

const FUNCOES_DISPONIVEIS = [
  'Lavagem Geral',
  'Polimento / Estetica',
  'Higienizacao Interna',
  'Lavagem de Motor',
  'Motorista (Leva e Traz)',
  'Atendimento / Patio'
];

export default function GestaoFuncionarios() {
  // Aponta para a porta 3000, exatamente como configurado no seu backend/server.js
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [filtroNomeCpf, setFiltroNomeCpf] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState('');

  const [formulario, setFormulario] = useState({
    cpf: '',
    nome: '',
    email: '',
    telefone: '',
    funcoes: ['Lavagem Geral'],
    senha: ''
  });

  useEffect(() => {
    async function buscarFuncionarios() {
      try {
        const resposta = await fetch(`${API_URL}/api/funcionarios`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
        });

        const contentType = resposta.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Resposta invalida do servidor');
        }

        const json = await resposta.json();
        if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao buscar funcionarios');
        
        setFuncionarios(json.dados || []);
      } catch (erro) {
        console.error('Erro ao buscar funcionarios no backend:', erro.message);
        setFuncionarios([]);
      } finally {
        setCarregando(false);
      }
    }
    buscarFuncionarios();
  }, [API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFuncao = (funcaoNome) => {
    setFormulario((prev) => {
      const jaPossui = prev.funcoes.includes(funcaoNome);
      if (jaPossui) {
        return { ...prev, funcoes: prev.funcoes.filter((f) => f !== funcaoNome) };
      } else {
        return { ...prev, funcoes: [...prev.funcoes, funcaoNome] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formulario.funcoes.length === 0) {
      alert('Selecione pelo menos uma funcao para o funcionario.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch(`${API_URL}/api/funcionarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}`
        },
        body: JSON.stringify(formulario)
      });

      const contentType = resposta.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `Erro ${resposta.status}: O servidor nao respondeu em JSON. Verifique se o backend na porta 3000 foi reiniciado.`
        );
      }

      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao cadastrar funcionario');

      setFuncionarios((prev) => [...prev, json.dados]);
      alert('Funcionario cadastrado com sucesso!');
      setFormulario({
        cpf: '',
        nome: '',
        email: '',
        telefone: '',
        funcoes: ['Lavagem Geral'],
        senha: ''
      });
    } catch (erro) {
      alert(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Deseja remover o funcionario ${nome}?`)) return;

    try {
      const resposta = await fetch(`${API_URL}/api/funcionarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });

      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao excluir no servidor');

      setFuncionarios((prev) => prev.filter((item) => item.id !== id));
    } catch (erro) {
      alert(erro.message);
    }
  };

  const funcionariosFiltrados = funcionarios.filter((f) => {
    const listaFuncoesTexto = Array.isArray(f.funcoes) ? f.funcoes.join(' ') : String(f.funcoes || '');
    const buscaNomeCpf =
      f.nome.toLowerCase().includes(filtroNomeCpf.toLowerCase()) ||
      f.cpf.includes(filtroNomeCpf);
    const buscaFuncao = listaFuncoesTexto.toLowerCase().includes(filtroFuncao.toLowerCase());
    return buscaNomeCpf && buscaFuncao;
  });

  return (
    <div className="gf-grid-container">
      {/* Coluna Esquerda: Cadastro */}
      <div className="gf-card-formulario">
        <h2 className="gf-titulo-card">Cadastrar Funcionario</h2>
        <p className="gf-subtitulo-card">
          Insira um colaborador e atribua uma ou mais funcoes operacionais. As comissoes sao calculadas por servico executado.
        </p>

        <form onSubmit={handleSubmit} className="gf-form">
          <div className="gf-form-group">
            <label>CPF (UNICO / CHAVE)</label>
            <input
              type="text"
              name="cpf"
              placeholder="000.000.000-00"
              value={formulario.cpf}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="gf-form-group">
            <label>NOME COMPLETO</label>
            <input
              type="text"
              name="nome"
              placeholder="Ex: Marcos Souza"
              value={formulario.nome}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="gf-form-group">
            <label>E-MAIL</label>
            <input
              type="email"
              name="email"
              placeholder="Ex: marcos@flexwash.com"
              value={formulario.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="gf-form-group">
            <label>TELEFONE</label>
            <input
              type="text"
              name="telefone"
              placeholder="Ex: (11) 99999-9999"
              value={formulario.telefone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="gf-form-group">
            <label>FUNCOES ATRIBUIDAS (SELECIONE UMA OU MAIS)</label>
            <div className="gf-funcoes-grid">
              {FUNCOES_DISPONIVEIS.map((funcao) => {
                const selecionado = formulario.funcoes.includes(funcao);
                return (
                  <label
                    key={funcao}
                    className={selecionado ? 'gf-checkbox-card ativo' : 'gf-checkbox-card'}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => toggleFuncao(funcao)}
                    />
                    <span>{funcao}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="gf-form-group">
            <label>SENHA DE ACESSO</label>
            <input
              type="password"
              name="senha"
              placeholder="Minimo 6 caracteres"
              value={formulario.senha}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="gf-btn-confirmar" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Confirmar Cadastro'}
          </button>
        </form>
      </div>

      {/* Coluna Direita: Listagem */}
      <div className="gf-card-listagem">
        <h2 className="gf-titulo-card">Funcionarios Cadastrados</h2>
        <p className="gf-subtitulo-card">
          Busca, gerenciamento de contatos e controle de funcoes habilitadas para comissionamento por servico.
        </p>

        <div className="gf-barra-filtros">
          <div className="gf-filtro-item">
            <label>FILTRO POR FUNCIONARIO (NOME / CPF)</label>
            <input
              type="text"
              placeholder="Buscar por Nome ou CPF..."
              value={filtroNomeCpf}
              onChange={(e) => setFiltroNomeCpf(e.target.value)}
            />
          </div>

          <div className="gf-filtro-item">
            <label>FILTRO POR FUNCAO ATRIBUIDA</label>
            <input
              type="text"
              placeholder="DIGITE A FUNCAO (EX: POLIMENTO, MOTOR)..."
              value={filtroFuncao}
              onChange={(e) => setFiltroFuncao(e.target.value)}
            />
          </div>
        </div>

        <div className="gf-tabela-wrapper">
          {carregando ? (
            <div className="gf-aviso-vazio">Carregando equipe...</div>
          ) : (
            <table className="gf-tabela">
              <thead>
                <tr>
                  <th>CPF</th>
                  <th>NOME</th>
                  <th>CONTATO / E-MAIL</th>
                  <th>FUNCOES HABILITADAS</th>
                  <th>REGRA DE COMISSAO</th>
                  <th>ACOES</th>
                </tr>
              </thead>
              <tbody>
                {funcionariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="gf-aviso-vazio">
                      Nenhum funcionario cadastrado no banco de dados.
                    </td>
                  </tr>
                ) : (
                  funcionariosFiltrados.map((func) => {
                    const listaFuncoes = Array.isArray(func.funcoes)
                      ? func.funcoes
                      : String(func.funcoes || '').split(',').map((f) => f.trim()).filter(Boolean);

                    return (
                      <tr key={func.id}>
                        <td className="gf-td-cpf">{func.cpf}</td>
                        <td className="gf-td-nome">
                          <strong>{func.nome}</strong>
                        </td>
                        <td>
                          <div className="gf-contato-tel">{func.telefone}</div>
                          <div className="gf-contato-email">{func.email}</div>
                        </td>
                        <td>
                          <div className="gf-tags-funcoes">
                            {listaFuncoes.map((fn, idx) => (
                              <span key={idx} className="gf-tag-funcao">
                                {fn}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="gf-badge-comissao">Por Servico</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="gf-btn-acao"
                            onClick={() => handleExcluir(func.id, func.nome)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}