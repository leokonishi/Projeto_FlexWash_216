import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Car, UserPlus, Users, Check } from 'lucide-react';
import CabecalhoPagina, { Secao } from '../componentes/ui/CabecalhoPagina';
import { aplicarMascaraCPF, aplicarMascaraTelefone, aplicarMascaraPlaca } from '../utils/mascaras';
import ModalFrota from '../componentes/ModalFrota';
import ModalPasso from '../componentes/ui/ModalPasso';
import { apiFetch } from '../utils/api';
import { obterPerfil } from '../utils/sessao';

export default function GestaoClientes({ abrirAlerta }) {
  const perfilUsuario = obterPerfil() || 'funcionario'; // lido do token
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Estados dos inputs
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');

  // Buscas e Listas
  const [buscaGeral, setBuscaGeral] = useState('');
  const [buscaPlaca, setBuscaPlaca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [clienteSelecionadoFrota, setClienteSelecionadoFrota] = useState(null);

  // Edição: guarda o id do cliente e os campos do formulário do modal
  const [edicao, setEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // 1. CARREGAR CLIENTES DO BANCO DE DADOS (GET)
  const buscarClientes = async () => {
    try {
      setCarregando(true);
      const resposta = await apiFetch(`${API_URL}/api/clientes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });
      if (resposta.ok) {
        const dados = await resposta.json();
        setClientes(dados);
      }
    } catch (erro) {
      console.error("Erro ao buscar clientes:", erro);
      abrirAlerta('Erro', 'Não foi possível carregar a lista de clientes.', () => {}, 'perigo');
    } finally {
      setCarregando(false);
    }
  };

  // Dispara a busca quando a tela abre pela primeira vez
  useEffect(() => {
    buscarClientes();
  }, []);

  // 2. SALVAR NOVO CLIENTE NO BANCO DE DADOS (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const novoCliente = { cpf, nome, email, telefone, endereco };

    try {
      const resposta = await apiFetch(`${API_URL}/api/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}`
        },
        body: JSON.stringify(novoCliente)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        abrirAlerta('Sucesso', 'Cliente cadastrado com sucesso!', () => {}, 'aviso');
        
        // Limpa os campos
        setCpf(''); setNome(''); setEmail(''); setTelefone(''); setEndereco('');
        
        // Atualiza a lista na tela automaticamente consultando o banco
        buscarClientes();
      } else {
        abrirAlerta('Atenção', dados.erro || dados.mensagem || 'Erro ao cadastrar.', () => {}, 'perigo');
      }
    } catch (erro) {
      console.error("Erro:", erro);
      abrirAlerta('Erro', 'Falha na conexão com o servidor.', () => {}, 'perigo');
    }
  };

  // 3. EDITAR CLIENTE (PUT)
  const abrirEdicao = (cliente) => {
    setEdicao({
      id: cliente.id,
      nome: cliente.nome || '',
      cpf: cliente.cpf || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
    });
  };
  const mudarEdicao = (campo, mascara) => (e) => {
    const valor = mascara ? mascara(e.target.value) : e.target.value;
    setEdicao(prev => ({ ...prev, [campo]: valor }));
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    if (salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      const { id, ...dados } = edicao;
      const resposta = await apiFetch(`${API_URL}/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      const json = await resposta.json().catch(() => ({}));
      if (resposta.ok) {
        setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...dados } : c)));
        setEdicao(null);
        abrirAlerta('Sucesso', 'Cliente atualizado com sucesso!', () => {}, 'aviso');
      } else {
        abrirAlerta('Atenção', json.erro || json.mensagem || 'Não foi possível salvar.', () => {}, 'perigo');
      }
    } catch {
      abrirAlerta('Erro', 'Falha na conexão com o servidor.', () => {}, 'perigo');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // 4. EXCLUIR CLIENTE (DELETE) - só administrador.
  // Se o cliente tiver lavagens no histórico, o servidor pede uma 2ª confirmação.
  const excluirNoServidor = async (cliente, incluirHistorico = false) => {
    try {
      const url = `${API_URL}/api/clientes/${cliente.id}${incluirHistorico ? '?incluirHistorico=1' : ''}`;
      const resposta = await apiFetch(url, { method: 'DELETE' });
      const json = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        setClientes(prev => prev.filter(c => c.id !== cliente.id));
        return;
      }
      if (json.precisaConfirmarHistorico) {
        abrirAlerta(
          'Apagar também o histórico?',
          `${cliente.nome} tem ${json.historico} lavagem(ns) no histórico. Excluir o cliente apaga esse histórico, os veículos e os agendamentos dele, e os valores saem dos relatórios. Esta ação não pode ser desfeita.`,
          () => excluirNoServidor(cliente, true),
          'perigo'
        );
        return;
      }
      abrirAlerta('Não foi possível excluir', json.erro || json.mensagem || 'Erro ao excluir o cliente.', () => {}, 'perigo');
    } catch {
      abrirAlerta('Erro', 'Falha na conexão com o servidor.', () => {}, 'perigo');
    }
  };

  const handleExcluir = (cliente) => {
    abrirAlerta(
      'Excluir cliente',
      `Tem certeza que deseja excluir o cadastro de ${cliente.nome}? Os veículos dele também serão removidos.`,
      () => excluirNoServidor(cliente),
      'perigo'
    );
  };

  const clientesFiltrados = clientes.filter(cliente => {
    // Verifica se a buscaGeral bate com nome ou CPF
    const matchGeral = cliente.nome.toLowerCase().includes(buscaGeral.toLowerCase()) || 
                       (cliente.cpf && cliente.cpf.includes(buscaGeral));
    
    // Verifica se a placa digitada existe na string de placas do cliente retornada pelo banco
    const matchPlaca = buscaPlaca === '' || 
                       (cliente.placas && cliente.placas.toUpperCase().replace(/-/g, '').includes(buscaPlaca.toUpperCase().replace(/-/g, '')));

    return matchGeral && matchPlaca;
  });
  
  const iniciais = (nome) => nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina titulo="Clientes" subtitulo="Cadastro de clientes, contatos e frotas de veículos." />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Secao titulo="Novo cliente" icone={UserPlus} className="self-start">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="gc-cpf" className="fw-label">CPF</label>
              <input id="gc-cpf" className="fw-input" type="text" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(aplicarMascaraCPF(e.target.value))} required />
            </div>
            <div>
              <label htmlFor="gc-nome" className="fw-label">Nome completo</label>
              <input id="gc-nome" className="fw-input" type="text" placeholder="Ex: Roberto Carlos" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <label htmlFor="gc-tel" className="fw-label">Telefone</label>
                <input id="gc-tel" className="fw-input" type="text" inputMode="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))} required />
              </div>
              <div>
                <label htmlFor="gc-email" className="fw-label">E-mail <span className="font-normal text-tinta-400">(opcional)</span></label>
                <input id="gc-email" className="fw-input" type="email" placeholder="roberto@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="gc-end" className="fw-label">Endereço <span className="font-normal text-tinta-400">(opcional)</span></label>
              <input id="gc-end" className="fw-input" type="text" placeholder="Av. Paulista, 1000 - SP" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <button type="submit" className="fw-btn-primario w-full"><Check size={17} /> Cadastrar cliente</button>
          </form>
        </Secao>

        <Secao
          titulo="Clientes cadastrados"
          icone={Users}
          acoes={!carregando && <span className="rounded-full bg-marca-50 px-2.5 py-1 text-xs font-bold text-marca-700">{clientesFiltrados.length}</span>}
          semPadding
        >
          <div className="grid gap-3 border-b border-tinta-100 p-4 sm:grid-cols-2 sm:px-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-400" />
              <input className="fw-input pl-10" type="text" placeholder="Buscar por nome ou CPF" value={buscaGeral} onChange={(e) => setBuscaGeral(e.target.value)} aria-label="Buscar por nome ou CPF" />
            </div>
            <div className="relative">
              <Car size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-400" />
              <input className="fw-input pl-10 font-mono uppercase placeholder:font-sans placeholder:normal-case" type="text" placeholder="Placa (ex: BRA2E19)" value={buscaPlaca} onChange={(e) => setBuscaPlaca(aplicarMascaraPlaca(e.target.value))} aria-label="Buscar por placa" />
            </div>
          </div>

          {carregando ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-tinta-100" />)}</div>
          ) : clientesFiltrados.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-tinta-500">Nenhum cliente encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="fw-tabela">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="hidden sm:table-cell">Contato</th>
                    <th className="hidden 2xl:table-cell">Endereço</th>
                    <th>Frota</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(cliente => (
                    <tr key={cliente.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-50 text-xs font-bold text-marca-700">{iniciais(cliente.nome)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-tinta-900">{cliente.nome}</p>
                            <p className="text-xs text-tinta-500">{cliente.cpf}</p><p className="text-xs text-tinta-500 sm:hidden">{cliente.telefone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <p className="whitespace-nowrap font-medium text-tinta-800">{cliente.telefone}</p>
                        {cliente.email && <p className="text-xs text-tinta-500">{cliente.email}</p>}
                      </td>
                      <td className="hidden max-w-[240px] truncate text-xs text-tinta-500 2xl:table-cell">{cliente.endereco || '—'}</td>
                      <td>
                        <button
                          onClick={() => setClienteSelecionadoFrota(cliente)}
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            cliente.frota > 0 ? 'bg-marca-50 text-marca-700 hover:bg-marca-100' : 'bg-tinta-100 text-tinta-500 hover:bg-tinta-200'
                          }`}
                        >
                          <Car size={14} /> {cliente.frota > 0 ? `${cliente.frota} ${cliente.frota === 1 ? 'carro' : 'carros'}` : 'Sem carros'}
                        </button>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirEdicao(cliente)} className="grid size-9 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-800" title="Editar" aria-label={`Editar ${cliente.nome}`}><Edit2 size={16} /></button>
                          {perfilUsuario === 'administrador' && (
                            <button className="fw-btn-perigo" onClick={() => handleExcluir(cliente)} title="Excluir" aria-label={`Excluir ${cliente.nome}`}><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </div>

      {edicao && (
        <ModalPasso
          titulo="Editar cliente"
          subtitulo={edicao.nome}
          aoFechar={() => setEdicao(null)}
          rodape={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEdicao(null)} className="fw-btn-contorno">Cancelar</button>
              <button type="submit" form="form-editar-cliente" className="fw-btn-primario" disabled={salvandoEdicao}>
                <Check size={17} /> {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          }
        >
          <form id="form-editar-cliente" onSubmit={salvarEdicao} className="space-y-4">
            <div>
              <label htmlFor="ec-nome" className="fw-label">Nome completo</label>
              <input id="ec-nome" className="fw-input" type="text" value={edicao.nome} onChange={mudarEdicao('nome')} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ec-cpf" className="fw-label">CPF</label>
                <input id="ec-cpf" className="fw-input" type="text" inputMode="numeric" value={edicao.cpf} onChange={mudarEdicao('cpf', aplicarMascaraCPF)} required />
              </div>
              <div>
                <label htmlFor="ec-tel" className="fw-label">Telefone</label>
                <input id="ec-tel" className="fw-input" type="text" inputMode="tel" value={edicao.telefone} onChange={mudarEdicao('telefone', aplicarMascaraTelefone)} />
              </div>
            </div>
            <div>
              <label htmlFor="ec-email" className="fw-label">E-mail</label>
              <input id="ec-email" className="fw-input" type="email" value={edicao.email} onChange={mudarEdicao('email')} />
            </div>
            <div>
              <label htmlFor="ec-end" className="fw-label">Endereço <span className="font-normal text-tinta-400">(opcional)</span></label>
              <input id="ec-end" className="fw-input" type="text" value={edicao.endereco} onChange={mudarEdicao('endereco')} />
            </div>
          </form>
        </ModalPasso>
      )}

      {clienteSelecionadoFrota && (
        <ModalFrota
          cliente={clienteSelecionadoFrota}
          /* Atualiza a lista principal ao fechar o modal */
          fecharModal={() => {
            setClienteSelecionadoFrota(null);
            buscarClientes();
          }}
          abrirAlerta={abrirAlerta}
        />
      )}
    </div>
  );
}
