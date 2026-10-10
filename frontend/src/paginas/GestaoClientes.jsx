import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Car } from 'lucide-react';
import '../paginas_css/gestao_clientes.css';
import { aplicarMascaraCPF, aplicarMascaraTelefone, aplicarMascaraPlaca } from '../utils/mascaras';
import ModalFrota from '../componentes/ModalFrota';

export default function GestaoClientes({ abrirAlerta }) {
  const perfilUsuario = localStorage.getItem('perfil_flexwash') || 'funcionario';
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

  // 1. CARREGAR CLIENTES DO BANCO DE DADOS (GET)
  const buscarClientes = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/api/clientes`, {
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
      const resposta = await fetch(`${API_URL}/api/clientes`, {
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
        abrirAlerta('Atenção', dados.erro || 'Erro ao cadastrar.', () => {}, 'perigo');
      }
    } catch (erro) {
      console.error("Erro:", erro);
      abrirAlerta('Erro', 'Falha na conexão com o servidor.', () => {}, 'perigo');
    }
  };

  const handleExcluir = (cliente) => {
    abrirAlerta(
      'Desativar Cliente',
      `Tem certeza que deseja desativar o cadastro de ${cliente.nome}?`,
      () => {
        // Futuramente colocaremos um fetch(DELETE) aqui.
        alert("Chamada para exclusão no banco em breve.");
      },
      'perigo'
    );
  };

  const clientesFiltrados = clientes.filter(cliente => {
    // Verifica se a buscaGeral bate com nome ou CPF
    const matchGeral = cliente.nome.toLowerCase().includes(buscaGeral.toLowerCase()) || 
                       (cliente.cpf && cliente.cpf.includes(buscaGeral));
    
    // Verifica se a placa digitada existe na string de placas do cliente retornada pelo banco
    const matchPlaca = buscaPlaca === '' || 
                       (cliente.placas && cliente.placas.includes(buscaPlaca));

    return matchGeral && matchPlaca;
  });
  
  return (
    <div className="clientes-layout">
      <aside>
        <div className="clientes-card">
          <h2 className="clientes-card-titulo">Cadastrar Cliente</h2>
          <p className="clientes-card-subtitulo">Insira um novo cliente no sistema para vinculação de frotas e veículos.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-cliente-grupo">
              <label>CPF (ÚNICO / CHAVE)</label>
              <input type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(aplicarMascaraCPF(e.target.value))} required />
            </div>
            <div className="form-cliente-grupo">
              <label>NOME COMPLETO</label>
              <input type="text" placeholder="Ex: Roberto Carlos" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="form-cliente-grupo">
              <label>E-MAIL</label>
              <input type="email" placeholder="Ex: roberto@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-cliente-grupo">
              <label>TELEFONE</label>
              <input type="text" placeholder="Ex: (11) 99999-9999" value={telefone} onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))} required />
            </div>
            <div className="form-cliente-grupo">
              <label>ENDEREÇO</label>
              <input type="text" placeholder="Ex: Av. Paulista, 1000 - SP" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <button type="submit" className="btn-confirmar-cadastro">Confirmar Cadastro</button>
          </form>
        </div>
      </aside>

      <main>
        <div className="clientes-card">
          <h2 className="clientes-card-titulo">Clientes Cadastrados</h2>
          <p className="clientes-card-subtitulo">Busca, gerenciamento de contatos e controle de frotas associadas.</p>
          
          <div className="busca-filtros">
            <div className="input-busca-wrapper">
              <label>FILTRO POR CLIENTE (NOME / CPF)</label>
              <Search size={16} className="icone-busca" />
              <input type="text" placeholder="Buscar por Nome ou CPF..." value={buscaGeral} onChange={(e) => setBuscaGeral(e.target.value)} />
            </div>
            <div className="input-busca-wrapper">
              <label>FILTRO POR VEÍCULO (PLACA)</label>
              <Search size={16} className="icone-busca" />
              <input type="text" placeholder="DIGITE A PLACA (EX: BRA2E19)..." value={buscaPlaca} onChange={(e) => setBuscaPlaca(aplicarMascaraPlaca(e.target.value))} />
            </div>
          </div>

          <div className="tabela-clientes-wrapper">
            {carregando ? (
               <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>A carregar clientes...</div>
            ) : (
              <table className="tabela-clientes">
                <thead>
                  <tr>
                    <th>CPF</th>
                    <th>NOME</th>
                    <th>CONTATO / E-MAIL</th>
                    <th>ENDEREÇO</th>
                    <th>FROTA DE VEÍCULOS</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(cliente => (
                    <tr key={cliente.id}>
                      <td><strong>{cliente.cpf}</strong></td>
                      <td><strong>{cliente.nome}</strong></td>
                      <td>
                        <strong>{cliente.telefone}</strong>
                        <span className="sub-texto">{cliente.email}</span>
                      </td>
                      <td><span className="sub-texto" style={{marginTop: 0}}>{cliente.endereco}</span></td>
                      <td>
                        {/* ALTERAÇÃO AQUI: Botão dinâmico com badge */}
                        <button 
  className={`btn-frota ${cliente.frota > 0 ? 'ativa' : ''}`} 
  onClick={() => setClienteSelecionadoFrota(cliente)}
>
  <Car size={14} /> 
  Frota 
  {cliente.frota > 0 ? (
    <span className="badge-contador">{cliente.frota}</span>
  ) : (
    ' (0)'
  )}
</button>
                      </td>
                      <td>
                        <div className="acoes-td">
                          <button className="pc-btn-acao"><Edit2 size={16} /></button>
                          {perfilUsuario === 'administrador' && (
                            <button className="pc-btn-acao" onClick={() => handleExcluir(cliente)}><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>Nenhum cliente encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {clienteSelecionadoFrota && (
        <ModalFrota 
          cliente={clienteSelecionadoFrota} 
          /* ALTERAÇÃO AQUI: Atualiza a lista principal ao fechar o modal */
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