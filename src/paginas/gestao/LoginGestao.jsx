import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../paginas_css/LoginGestao.css'; // Opcional para seus estilos específicos

export default function LoginGestao() {
  const [perfilSelecionado, setPerfilSelecionado] = useState('administrador');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      const resposta = await fetch('http://localhost:8080/api/login-gestao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, perfil: perfilSelecionado })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.mensagem || 'Erro ao realizar login.');
      }

      // Validação adicional de segurança no front-end:
      // Se o usuário logou com sucesso, mas o perfil real dele no banco for 'funcionario' 
      // e ele tentou forçar o login selecionando a aba 'administrador', barramos aqui.
      if (resultado.usuario.perfil === 'funcionario' && perfilSelecionado === 'administrador') {
        alert('Erro: Este usuário é um Funcionário e não possui permissão de Administrador!');
        setErro('Acesso negado: Perfil de administrador inválido para este usuário.');
        return;
      }

      // Alerta de login bem-sucedido com o nome do usuário
      alert(`Login bem-sucedido! Bem-vindo(a), ${resultado.usuario.nome}.`);

      // Salva o token no navegador
      localStorage.setItem('token_flexwash', resultado.token);

      // Redireciona com base no perfil validado
      if (resultado.usuario.perfil === 'administrador') {
        navigate('/admin');
      } else {
        navigate('/funcionario/painel');
      }

    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-placeholder"></div>
        
        <h2>Flex Wash</h2>
        <p className="subtitulo">Gestão Inteligente de Estética Automotiva</p>

        <form onSubmit={handleLogin}>
          <label className="label-campo">PERFIL DE ACESSO</label>
          <div className="perfil-selector">
            <button
              type="button"
              className={`perfil-btn ${perfilSelecionado === 'administrador' ? 'ativo' : ''}`}
              onClick={() => setPerfilSelecionado('administrador')}
            >
              👤 Administrador
            </button>
            <button
              type="button"
              className={`perfil-btn ${perfilSelecionado === 'funcionario' ? 'ativo' : ''}`}
              onClick={() => setPerfilSelecionado('funcionario')}
            >
              👤 Funcionário
            </button>
          </div>

          <label className="label-campo">USUÁRIO / E-MAIL</label>
          <div className="input-wrapper">
            <input
              type="email"
              placeholder="admin@flexwash.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="label-campo">SENHA DE ACESSO</label>
          <div className="input-wrapper">
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && <p className="erro-msg">{erro}</p>}

          <button type="submit" className="submit-btn">
            Acessar Painel →
          </button>
        </form>
      </div>
    </div>
  );
}