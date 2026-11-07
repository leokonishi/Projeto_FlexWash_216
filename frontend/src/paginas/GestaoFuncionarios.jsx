import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Search, UserPlus, Users, Trash2, Check, Loader2, Wrench, Edit2, UserCog } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';

// Os textos são gravados no banco como estão: não mudar a grafia sem migrar os dados
const FUNCOES_DISPONIVEIS = [
  'Lavagem Geral',
  'Polimento / Estetica',
  'Higienizacao Interna',
  'Lavagem de Motor',
  'Motorista (Leva e Traz)',
  'Atendimento / Patio'
];

// Só para exibir com acento (o valor salvo continua o de cima)
const ROTULO_FUNCAO = {
  'Polimento / Estetica': 'Polimento / Estética',
  'Higienizacao Interna': 'Higienização Interna',
  'Atendimento / Patio': 'Atendimento / Pátio'
};
const rotuloFuncao = (f) => ROTULO_FUNCAO[f] || f;

export default function GestaoFuncionarios({ abrirAlerta }) {
  // Avisos no modal do painel (cai no alert do navegador se a tela for usada fora dele)
  const avisar = (titulo, mensagem, tipo = 'aviso') => {
    if (abrirAlerta) abrirAlerta(titulo, mensagem, () => {}, tipo);
    else alert(mensagem);
  };

  // Mesma porta padrão do backend/server.js (8080) usada nas demais telas
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [filtroNomeCpf, setFiltroNomeCpf] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState('');

  const FORM_VAZIO = { cpf: '', nome: '', email: '', telefone: '', funcoes: ['Lavagem Geral'], senha: '' };
  const [formulario, setFormulario] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null); // null = cadastro novo
  const editando = editandoId !== null;

  const iniciarEdicao = (func) => {
    const listaFuncoes = Array.isArray(func.funcoes)
      ? func.funcoes
      : String(func.funcoes || '').split(',').map((f) => f.trim()).filter(Boolean);
    setEditandoId(func.id);
    setFormulario({
      cpf: func.cpf || '',
      nome: func.nome || '',
      email: func.email || '',
      telefone: func.telefone || '',
      funcoes: listaFuncoes,
      senha: ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormulario(FORM_VAZIO);
  };

  useEffect(() => {
    async function buscarFuncionarios() {
      try {
        const resposta = await apiFetch(`${API_URL}/api/funcionarios`);

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
      avisar('Atenção', 'Selecione pelo menos uma função para o funcionário.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await apiFetch(editando ? `${API_URL}/api/funcionarios/${editandoId}` : `${API_URL}/api/funcionarios`, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulario)
      });

      const contentType = resposta.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `Erro ${resposta.status}: O servidor nao respondeu em JSON. Verifique se o backend esta rodando e foi reiniciado.`
        );
      }

      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao salvar funcionario');

      if (editando) {
        setFuncionarios((prev) => prev.map((f) => (f.id === editandoId ? { ...f, ...json.dados } : f)));
        avisar('Sucesso', 'Funcionário atualizado com sucesso!');
      } else {
        setFuncionarios((prev) => [...prev, json.dados]);
        avisar('Sucesso', 'Funcionário cadastrado com sucesso!');
      }
      setEditandoId(null);
      setFormulario(FORM_VAZIO);
    } catch (erro) {
      avisar('Erro', erro.message, 'perigo');
    } finally {
      setEnviando(false);
    }
  };

  const excluirNoServidor = async (id) => {
    try {
      const resposta = await apiFetch(`${API_URL}/api/funcionarios/${id}`, {
        method: 'DELETE'
      });

      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.mensagem || 'Erro ao excluir no servidor');

      setFuncionarios((prev) => prev.filter((item) => item.id !== id));
      if (editandoId === id) cancelarEdicao();
    } catch (erro) {
      avisar('Erro', erro.message, 'perigo');
    }
  };

  const handleExcluir = (id, nome) => {
    if (abrirAlerta) {
      abrirAlerta('Remover funcionário', `Deseja remover o funcionário ${nome}? Ele perde o acesso ao sistema. As lavagens que já fez continuam no histórico.`, () => excluirNoServidor(id), 'perigo');
    } else if (window.confirm(`Deseja remover o funcionário ${nome}?`)) {
      excluirNoServidor(id);
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

  const campo = (name, rotulo, props = {}) => (
    <div>
      <label htmlFor={`gf-${name}`} className="fw-label">{rotulo}</label>
      <input id={`gf-${name}`} name={name} className="fw-input" value={formulario[name]} onChange={handleInputChange} required {...props} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina
        titulo="Funcionários"
        subtitulo="Cadastre a equipe e as funções de cada um. As comissões são calculadas por serviço executado."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Secao
          titulo={editando ? 'Editar funcionário' : 'Novo funcionário'}
          icone={editando ? UserCog : UserPlus}
          className="self-start"
          acoes={editando && <button type="button" onClick={cancelarEdicao} className="text-sm font-semibold text-tinta-500 hover:text-tinta-800">Cancelar</button>}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {campo('nome', 'Nome completo', { type: 'text', placeholder: 'Ex: Marcos Souza' })}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {campo('cpf', 'CPF', { type: 'text', placeholder: '000.000.000-00', inputMode: 'numeric' })}
              {campo('telefone', 'Telefone', { type: 'text', placeholder: '(11) 99999-9999', inputMode: 'tel' })}
            </div>
            {campo('email', 'E-mail', { type: 'email', placeholder: 'marcos@flexwash.com' })}

            <div>
              <span className="fw-label">Funções <span className="font-normal text-tinta-400">(uma ou mais)</span></span>
              <div className="flex flex-wrap gap-2">
                {FUNCOES_DISPONIVEIS.map((funcao) => {
                  const selecionado = formulario.funcoes.includes(funcao);
                  return (
                    <button
                      type="button"
                      key={funcao}
                      onClick={() => toggleFuncao(funcao)}
                      aria-pressed={selecionado}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selecionado ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-tinta-200 bg-white text-tinta-600 hover:border-marca-300'
                      }`}
                    >
                      {selecionado && <Check size={14} className="text-marca-600" />}
                      {rotuloFuncao(funcao)}
                    </button>
                  );
                })}
              </div>
            </div>

            {editando
              ? campo('senha', 'Nova senha (opcional)', { type: 'password', placeholder: 'Deixe em branco para manter a atual', autoComplete: 'new-password', required: false, minLength: 6 })
              : campo('senha', 'Senha de acesso', { type: 'password', placeholder: 'Mínimo 6 caracteres', autoComplete: 'new-password', minLength: 6 })}

            <button type="submit" className="fw-btn-primario w-full" disabled={enviando}>
              {enviando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
              {enviando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar funcionário'}
            </button>
          </form>
        </Secao>

        <Secao
          titulo="Equipe"
          icone={Users}
          acoes={!carregando && <span className="rounded-full bg-marca-50 px-2.5 py-1 text-xs font-bold text-marca-700">{funcionariosFiltrados.length}</span>}
          semPadding
        >
          <div className="grid gap-3 border-b border-tinta-100 p-4 sm:grid-cols-2 sm:px-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-400" />
              <input className="fw-input pl-10" type="text" placeholder="Buscar por nome ou CPF" value={filtroNomeCpf} onChange={(e) => setFiltroNomeCpf(e.target.value)} aria-label="Buscar por nome ou CPF" />
            </div>
            <div className="relative">
              <Wrench size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-400" />
              <input className="fw-input pl-10" type="text" placeholder="Filtrar por função" value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)} aria-label="Filtrar por função" />
            </div>
          </div>

          {carregando ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-tinta-100" />)}</div>
          ) : funcionariosFiltrados.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-tinta-500">Nenhum funcionário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="fw-tabela">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th className="hidden sm:table-cell">Contato</th>
                    <th>Funções</th>
                    <th className="hidden md:table-cell">Comissão</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.map((func) => {
                    const listaFuncoes = Array.isArray(func.funcoes)
                      ? func.funcoes
                      : String(func.funcoes || '').split(',').map((f) => f.trim()).filter(Boolean);

                    return (
                      <tr key={func.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta-950 text-xs font-bold text-ouro-300">
                              {func.nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-tinta-900">{func.nome}</p>
                              <p className="whitespace-nowrap text-xs text-tinta-500">{func.cpf}</p><p className="whitespace-nowrap text-xs text-tinta-500 sm:hidden">{func.telefone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <p className="whitespace-nowrap font-medium text-tinta-800">{func.telefone}</p>
                          <p className="text-xs text-tinta-500">{func.email}</p>
                        </td>
                        <td>
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {listaFuncoes.map((fn, idx) => (
                              <span key={idx} className="rounded-md bg-tinta-100 px-2 py-0.5 text-xs font-medium text-tinta-700">{rotuloFuncao(fn)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="whitespace-nowrap rounded-full bg-ouro-50 px-2.5 py-1 text-xs font-semibold text-ouro-700 ring-1 ring-inset ring-ouro-200">Por serviço</span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => iniciarEdicao(func)} className="grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Editar" aria-label={`Editar ${func.nome}`}>
                            <Edit2 size={16} />
                          </button>
                          <button type="button" className="fw-btn-perigo" onClick={() => handleExcluir(func.id, func.nome)} title="Remover" aria-label={`Remover ${func.nome}`}>
                            <Trash2 size={16} />
                          </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </div>
    </div>
  );
}
