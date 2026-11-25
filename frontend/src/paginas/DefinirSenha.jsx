import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import LayoutAcesso from '../componentes/ui/LayoutAcesso';
import { REGRA_SENHA, senhaValida } from '../utils/mascaras';
import { API_URL } from '../utils/api';


// Aberta pelo link do e-mail.
// Cliente: cria (primeiro acesso) ou troca a senha e já entra.
// Equipe (area="equipe"): troca a senha e volta para o login da gestão.
export default function DefinirSenha({ area = 'cliente' }) {
  const ehEquipe = area === 'equipe';
  const rotaApi = `${API_URL}/api/acesso${ehEquipe ? '/equipe' : ''}`;
  const rotaLogin = ehEquipe ? '/gestao/login' : '/cliente/login';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [estado, setEstado] = useState('carregando'); // carregando | pronto | invalido | concluido
  const [info, setInfo] = useState({ nome: '', primeiro_acesso: true });
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${rotaApi}/link?token=${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setInfo(json);
          setEstado('pronto');
        } else {
          setErro(json.mensagem || 'Link inválido.');
          setEstado('invalido');
        }
      } catch {
        setErro('Não foi possível conectar ao servidor.');
        setEstado('invalido');
      }
    })();
  }, [token, rotaApi]);

  const salvar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!senhaValida(senha)) return setErro(`Senha fraca. ${REGRA_SENHA}`);
    if (senha !== confirmacao) return setErro('As duas senhas não são iguais.');
    setEnviando(true);
    try {
      const res = await fetch(`${rotaApi}/senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && ehEquipe) {
        setEstado('concluido');
      } else if (res.ok && json.token) {
        localStorage.setItem('token_flexwash', json.token);
        navigate('/cliente', { replace: true });
      } else {
        setErro(json.mensagem || 'Não foi possível salvar a senha.');
        if (res.status === 410) setEstado('invalido');
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  if (estado === 'carregando') {
    return (
      <LayoutAcesso titulo="Conferindo o link..." subtitulo="Só um instante.">
        <div className="grid place-items-center py-6"><Loader2 className="animate-spin text-marca-600" /></div>
      </LayoutAcesso>
    );
  }

  if (estado === 'concluido') {
    return (
      <LayoutAcesso titulo="Senha trocada!" subtitulo="Agora entre no painel com a nova senha.">
        <Link to={rotaLogin} className="fw-btn-primario h-12 w-full text-[15px]">Ir para o login <ArrowRight size={18} /></Link>
      </LayoutAcesso>
    );
  }

  if (estado === 'invalido') {
    return (
      <LayoutAcesso titulo="Link indisponível" subtitulo={ehEquipe ? 'Peça um novo link na tela de login da equipe, em "Esqueci minha senha".' : 'Peça um novo link na tela de login, em "Primeiro acesso ou esqueci a senha".'}>
        <div className="space-y-4">
          <div className="fw-alerta-erro" role="alert">{erro}</div>
          <Link to={rotaLogin} className="fw-btn-primario h-12 w-full text-[15px]">Ir para o login</Link>
        </div>
      </LayoutAcesso>
    );
  }

  const campoSenha = (id, rotulo, valor, setValor, autoComplete) => (
    <div>
      <label htmlFor={id} className="fw-label">{rotulo}</label>
      <div className="relative">
        <input id={id} type={mostrar ? 'text' : 'password'} required autoComplete={autoComplete} className="fw-input pr-11"
          value={valor} onChange={(e) => setValor(e.target.value)} />
        <button type="button" onClick={() => setMostrar((v) => !v)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-tinta-400 hover:text-tinta-700"
          aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}>
          {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <LayoutAcesso
      titulo={info.primeiro_acesso ? `Olá${info.nome ? `, ${info.nome}` : ''}! Crie sua senha` : 'Crie uma nova senha'}
      subtitulo={ehEquipe ? 'Depois você entra no painel com a nova senha.' : 'Depois disso você já entra na sua conta para agendar e acompanhar seu carro.'}
    >
      <form onSubmit={salvar} className="space-y-4">
        {erro && <div className="fw-alerta-erro" role="alert">{erro}</div>}
        {campoSenha('nova-senha', 'Nova senha', senha, setSenha, 'new-password')}
        <p className="-mt-2 text-xs text-tinta-500">{REGRA_SENHA}</p>
        {campoSenha('confirmar-senha', 'Repita a senha', confirmacao, setConfirmacao, 'new-password')}
        <button type="submit" disabled={enviando} className="fw-btn-primario mt-2 h-12 w-full text-[15px]">
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <>{ehEquipe ? 'Salvar nova senha' : 'Salvar e entrar'} <ArrowRight size={18} /></>}
        </button>
      </form>
    </LayoutAcesso>
  );
}
