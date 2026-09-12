import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../paginas_css/login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        // Salva o token no localStorage para as rotas protegidas
        localStorage.setItem('token_flexwash', dados.token);
        // Redireciona para o painel admin
        navigate('/admin');
      } else {
        setErro(dados.mensagem || 'E-mail ou senha inválidos.');
      }
    } catch (err) {
      console.error("Erro na requisição de login:", err);
      setErro('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="container-login">
      <div className="cartao-login">
        
        <div className="cabecalho-login">
          <h1 className="titulo-login">Flex<span>Wash</span></h1>
          <p className="subtitulo-login">Faça login para acessar o painel</p>
        </div>

        {erro && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {erro}
          </div>
        )}

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

          <button type="submit" className="botao-entrar" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
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