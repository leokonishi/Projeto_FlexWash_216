import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Wrench, LayoutDashboard, Gauge, Users } from 'lucide-react';
import LayoutAcesso from '../../componentes/ui/LayoutAcesso';
import { API_URL } from '../../utils/api';

const DESTAQUES_EQUIPE = [
  { icone: Gauge, texto: 'Fluxo do pátio em tempo real, do agendado ao pronto' },
  { icone: LayoutDashboard, texto: 'Faturamento, serviços e leva e traz num só painel' },
  { icone: Users, texto: 'Clientes, frotas e comissões da equipe organizados' },
];

const PERFIS = [
  { valor: 'administrador', nome: 'Administrador', icone: ShieldCheck },
  { valor: 'funcionario', nome: 'Funcionário', icone: Wrench },
];

export default function LoginGestao() {
  const [perfilSelecionado, setPerfilSelecionado] = useState('administrador');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);


    try {
      const resposta = await fetch(`${API_URL}/api/login-gestao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, perfil: perfilSelecionado })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.mensagem || 'Erro ao realizar login.');
      }

      // Validação adicional no front-end: um funcionário que tentou entrar pela aba
      // de administrador é barrado aqui (o backend também confere o perfil no token).
      if (resultado.usuario.perfil === 'funcionario' && perfilSelecionado === 'administrador') {
        setErro('Acesso negado: este usuário é Funcionário e não tem permissão de Administrador.');
        return;
      }

      // Salva o token e o PERFIL no navegador (Essencial para os bloqueios na tela do Painel)
      localStorage.setItem('token_flexwash', resultado.token);
      localStorage.setItem('perfil_flexwash', resultado.usuario.perfil);

      // Redireciona TODO MUNDO para a rota unificada
      navigate('/painel');

    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <LayoutAcesso
      titulo="Acesso da equipe"
      subtitulo="Entre para gerenciar o pátio e o lava-rápido."
      selo="Painel de gestão"
      chamada={<>Seu pátio, <span className="bg-linear-to-r from-marca-300 to-verde-300 bg-clip-text text-transparent">sob controle.</span></>}
      destaques={DESTAQUES_EQUIPE}
      rodape={<>É cliente? <Link to="/login" className="font-semibold text-marca-600 hover:text-marca-700">Entrar na área do cliente</Link></>}
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <span className="fw-label">Perfil de acesso</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-tinta-100 p-1">
            {PERFIS.map(({ valor, nome, icone: Icone }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setPerfilSelecionado(valor)}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                  perfilSelecionado === valor ? 'bg-white text-tinta-950 shadow-sm' : 'text-tinta-500 hover:text-tinta-800'
                }`}
              >
                <Icone size={16} className={perfilSelecionado === valor ? 'text-marca-600' : ''} /> {nome}
              </button>
            ))}
          </div>
        </div>

        {erro && <div className="fw-alerta-erro" role="alert">{erro}</div>}

        <div>
          <label htmlFor="gestao-email" className="fw-label">E-mail</label>
          <input
            id="gestao-email"
            type="email"
            required
            autoComplete="username"
            className="fw-input"
            placeholder="admin@flexwash.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="gestao-senha" className="fw-label">Senha</label>
          <div className="relative">
            <input
              id="gestao-senha"
              type={mostrarSenha ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="fw-input pr-11"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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

        <button type="submit" disabled={enviando} className="fw-btn-escuro mt-2 h-12 w-full text-[15px]">
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <>Acessar painel <ArrowRight size={18} /></>}
        </button>
      </form>
    </LayoutAcesso>
  );
}
