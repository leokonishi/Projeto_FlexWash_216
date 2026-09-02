import { useState } from 'react';
import '../paginas_css/Cadastro_Cliente.css';

export default function CadastroCliente() {
  const [formulario, setFormulario] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: ''
  });

  const aoMudarCampo = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const aoEnviarFormulario = (e) => {
    e.preventDefault();
    console.log('Dados de cadastro do cliente:', formulario);
  };

  return (
    <div className="container-cadastro-cliente">
      <div className="cartao-cadastro-cliente">
        <h1 className="titulo-cadastro-cliente">Flex Wash</h1>
        <p className="subtitulo-cadastro-cliente">Gestão Inteligente de Estética Automotiva</p>

        <form onSubmit={aoEnviarFormulario}>
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
              value={formulario.telefone}
              onChange={aoMudarCampo}
              placeholder="(11) 99999-9999"
            />
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
          Já tem uma conta? <a href="/login">Faça login</a>
        </p>
      </div>
    </div>
  );
}