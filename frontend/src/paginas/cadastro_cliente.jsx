import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../paginas_css/cadastro_cliente.css';
import { aplicarMascaraCPF, aplicarMascaraTelefone } from '../utils/mascaras'; // Importando as máscaras reutilizáveis!
import FormEnderecoCep from '../componentes/FormEnderecoCep';
import { ENDERECO_VAZIO, enderecoCompleto, enderecoVazio, partesParaApi } from '../utils/endereco';

export default function CadastroCliente() {
  const navigate = useNavigate();
  
  // 1. Atualizamos o estado para incluir CPF e Endereço
  const [formulario, setFormulario] = useState({
    cpf: '',
    nome: '',
    email: '',
    senha: '',
    telefone: ''
  });
  // Endereço (opcional no cadastro, usado no leva e traz), com busca pelo CEP
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);

  // 2. Intercetamos a digitação para aplicar as máscaras em tempo real
  const aoMudarCampo = (e) => {
    let { name, value } = e.target;
    
    if (name === 'cpf') value = aplicarMascaraCPF(value);
    if (name === 'telefone') value = aplicarMascaraTelefone(value);
    
    setFormulario({ ...formulario, [name]: value });
  };

  const aoEnviarFormulario = async (e) => {
    e.preventDefault();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    // Endereço é opcional, mas se começou a preencher, precisa estar completo
    if (!enderecoVazio(endereco) && !enderecoCompleto(endereco)) {
      alert('Complete o endereço (CEP, rua, número, bairro, cidade e UF) ou deixe todos os campos em branco.');
      return;
    }
    const dados = { ...formulario, ...(enderecoCompleto(endereco) ? { endereco_partes: partesParaApi(endereco) } : {}) };

    try {
      const resposta = await fetch(`${API_URL}/api/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        alert(resultado.mensagem || 'Cliente cadastrado com sucesso!');
        navigate('/Login');
      } else {
        // Agora, se o cliente tentar usar um e-mail ou CPF já existente, ele verá o alerta formatado do backend!
        alert(resultado.erro || 'Erro ao realizar cadastro.');
      }
    } catch (erro) {
      console.error('Erro na conexão com o servidor:', erro);
      alert('Não foi possível conectar ao servidor backend.');
    }
  };

  return (
    <div className="container-cadastro-cliente">
      <div className="cartao-cadastro-cliente">
        <h1 className="titulo-cadastro-cliente">Flex Wash Cliente</h1>
        <p className="subtitulo-cadastro-cliente">Gestão Inteligente de Estética Automotiva</p>

        <form onSubmit={aoEnviarFormulario}>
          
          {/* NOVO CAMPO: CPF */}
          <div className="grupo-campo">
            <label>CPF</label>
            <input
              type="text"
              name="cpf"
              required
              value={formulario.cpf}
              onChange={aoMudarCampo}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="grupo-campo">
            <label>Nome Completo</label>
            <input
              type="text"
              name="nome"
              required
              value={formulario.nome}
              onChange={aoMudarCampo}
              placeholder="Digite seu nome completo"
            />
          </div>

          <div className="grupo-campo">
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              required
              value={formulario.email}
              onChange={aoMudarCampo}
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div className="grupo-campo">
            <label>Telefone / WhatsApp</label>
            <input
              type="text"
              name="telefone"
              required
              value={formulario.telefone}
              onChange={aoMudarCampo}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Endereço (para o leva e traz): opcional, com busca pelo CEP */}
          <div className="grupo-campo">
            <label>Endereço <span style={{ textTransform: 'none', fontWeight: 500, color: '#64748b' }}>(opcional, para o leva e traz)</span></label>
            <FormEnderecoCep valor={endereco} aoMudar={setEndereco} tema="escuro" />
          </div>

          <div className="grupo-campo">
            <label>Senha de Acesso</label>
            <input
              type="password"
              name="senha"
              required
              value={formulario.senha}
              onChange={aoMudarCampo}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="botao-cadastrar-cliente">
            Cadastrar Cliente &rarr;
          </button>
        </form>

        <p className="rodape-cliente">
          Já tem uma conta? <Link to="/Login">Faça login</Link>
        </p>
      </div>
    </div>
  );
}