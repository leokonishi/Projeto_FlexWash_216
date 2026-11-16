import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Mail } from 'lucide-react';
import LayoutAcesso from '../componentes/ui/LayoutAcesso';
import { aplicarMascaraEmail } from '../utils/mascaras';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Motivo de ter caído no login (sessão vencida, acesso encerrado), deixado pelo apiFetch
  const [erro, setErro] = useState(() => {
    try { const m = sessionStorage.getItem('aviso_login'); return m; } catch { return null; }
  });
  useEffect(() => { try { sessionStorage.removeItem('aviso_login'); } catch { /* sem storage */ } }, []);
  // Primeiro acesso (cliente cadastrado no balcão) e "esqueci minha senha": link pelo e-mail
  const [modoLink, setModoLink] = useState(false);
  const [semSenha, setSemSenha] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(null);

  // Vindo do cadastro concluído
  const recemCadastrado = location.state?.cadastrado;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    // Define a URL base da API (pega da Vercel em produção ou usa o localhost para testes)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
      } else if (resultado.motivo === 'sem_senha') {
        setSemSenha(true);
        setErro(resultado.mensagem);
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

  const pedirLink = async (e) => {
    e?.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const resposta = await fetch(`${API_URL}/api/acesso/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const resultado = await resposta.json().catch(() => ({}));
      if (resposta.ok) setLinkEnviado(resultado.mensagem);
      else setErro(resultado.mensagem || 'Não foi possível enviar o link.');
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirModoLink = () => { setModoLink(true); setErro(null); setSemSenha(false); setLinkEnviado(null); };

  if (modoLink) {
    return (
      <LayoutAcesso
        titulo="Primeiro acesso ou nova senha"
        subtitulo="Digite o e-mail do seu cadastro. Enviamos um link para você criar a senha."
        rodape={<button type="button" onClick={() => setModoLink(false)} className="font-semibold text-marca-600 hover:text-marca-700">Voltar para o login</button>}
      >
        {linkEnviado ? (
          <div className="space-y-4">
            <div className="fw-alerta-sucesso" role="status">{linkEnviado}</div>
            <p className="text-sm text-tinta-500">O link vale por 48 horas. Não chegou? Confira o e-mail digitado ou peça na recepção para atualizar o seu cadastro.</p>
            <button type="button" onClick={() => setLinkEnviado(null)} className="fw-btn-contorno h-11 w-full">Enviar de novo</button>
          </div>
        ) : (
          <form onSubmit={pedirLink} className="space-y-4">
            {erro && <div className="fw-alerta-erro" role="alert">{erro}</div>}
            <div>
              <label htmlFor="link-email" className="fw-label">E-mail</label>
              <input id="link-email" type="email" required autoComplete="email" className="fw-input" value={email}
                onChange={(e) => setEmail(aplicarMascaraEmail(e.target.value))} placeholder="seu.email@exemplo.com" />
            </div>
            <button type="submit" disabled={enviando} className="fw-btn-primario h-12 w-full text-[15px]">
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={18} /> Enviar link</>}
            </button>
          </form>
        )}
      </LayoutAcesso>
    );
  }

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
        {erro && (
          <div className="fw-alerta-erro" role="alert">
            {erro}
            {semSenha && (
              <button type="button" onClick={() => { abrirModoLink(); pedirLink(); }} className="mt-2 block font-semibold underline">
                Enviar o link para {email}
              </button>
            )}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="fw-label">E-mail</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            className="fw-input"
            value={email}
            onChange={(e) => setEmail(aplicarMascaraEmail(e.target.value))}
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

        <div className="-mt-1 text-right">
          <button type="button" onClick={abrirModoLink} className="text-sm font-semibold text-marca-600 hover:text-marca-700">
            Primeiro acesso ou esqueci a senha
          </button>
        </div>

        <button type="submit" disabled={enviando} className="fw-btn-primario h-12 w-full text-[15px]">
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
        </button>
      </form>
    </LayoutAcesso>
  );
}
