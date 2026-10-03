import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../paginas_css/Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Define a URL base da API (pega da Vercel em produção ou usa o localhost para testes)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    try {
      const resposta = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        localStorage.setItem('token_flexwash', resultado.token);

        alert(resultado.mensagem || 'Login realizado com sucesso!');
        navigate('/PaginaCliente');
      } else {
        alert(resultado.mensagem || 'E-mail ou senha inválidos.');
      }
    } catch (erro) {
      console.error('Erro na requisição:', erro);
      alert('Não foi possível conectar ao servidor.');
    }

  };

  return (
    <div className="container-login">
      <div className="cartao-login">
        
        <div className="cabecalho-login">
          <h1 className="titulo-login">Flex<span>Wash</span></h1>
          <p className="subtitulo-login">Faça login para acessar o painel</p>
        </div>

        <form onSubmit={handleLogin} className="formulario-login">
          <div className="grupo-campo-login">
            <label>E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div className="grupo-campo-login">
            <label>Senha</label>
            <input 
              type="password" 
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="botao-entrar">
            Entrar
          </button>
        </form>

        <div className="rodape-login">
          <p>
            Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </div>

      </div>
    </div>
  );
}