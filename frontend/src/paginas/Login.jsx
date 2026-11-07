import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import LayoutAcesso from '../componentes/ui/LayoutAcesso';
import { API_URL } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Vindo do cadastro concluído
  const recemCadastrado = location.state?.cadastrado;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);


    try {
      const resposta = await fetch(`${API_URL}/api/login/cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        localStorage.setItem('token_flexwash', resultado.token);
        navigate('/PaginaCliente');
      } else {
        setErro(resultado.mensagem || 'E-mail ou senha inválidos.');
      }
    } catch (erro) {
      console.error('Erro na requisição:', erro);
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <LayoutAcesso
      titulo="Bem-vindo de volta"
      subtitulo="Entre para agendar e acompanhar a lavagem do seu carro."
      rodape={<>Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-marca-600 hover:text-marca-700">Criar conta</Link></>}
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {recemCadastrado && !erro && (
          <div className="fw-alerta-sucesso">Conta criada! Agora é só entrar com o seu e-mail e senha.</div>
        )}
        {erro && <div className="fw-alerta-erro" role="alert">{erro}</div>}

        <div>
          <label htmlFor="login-email" className="fw-label">E-mail</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            className="fw-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@exemplo.com"
          />
        </div>

        <div>
          <label htmlFor="login-senha" className="fw-label">Senha</label>
          <div className="relative">
            <input
              id="login-senha"
              type={mostrarSenha ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="fw-input pr-11"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-tinta-400 hover:text-tinta-700"
              aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={enviando} className="fw-btn-primario mt-2 h-12 w-full text-[15px]">
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
        </button>
      </form>
    </LayoutAcesso>
  );
}
