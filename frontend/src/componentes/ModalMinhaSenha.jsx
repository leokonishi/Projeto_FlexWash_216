import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { API_URL, apiFetch } from '../utils/api';
import { REGRA_SENHA, senhaValida } from '../utils/mascaras';

// Troca da própria senha (funcionário ou administrador logado)
export default function ModalMinhaSenha({ aberto, fechar, aoTrocar }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!aberto) return null;

  const sair = () => {
    setAtual(''); setNova(''); setConfirmacao(''); setErro(''); setMostrar(false);
    fechar();
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!senhaValida(nova)) return setErro(`Senha fraca. ${REGRA_SENHA}`);
    if (nova !== confirmacao) return setErro('As duas senhas novas não são iguais.');
    setEnviando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/funcionario/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: atual, nova_senha: nova }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.mensagem || 'Não foi possível trocar a senha.');
      sair();
      aoTrocar?.(json.mensagem || 'Senha trocada com sucesso!');
    } catch (err) {
      setErro(err.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = (id, rotulo, valor, setValor, autoComplete) => (
    <div>
      <label htmlFor={id} className="fw-label">{rotulo}</label>
      <input id={id} type={mostrar ? 'text' : 'password'} required autoComplete={autoComplete} className="fw-input"
        value={valor} onChange={(e) => setValor(e.target.value)} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-tinta-950/55 p-4 backdrop-blur-sm animate-surgir sm:items-center">
      <form onSubmit={salvar} role="dialog" aria-modal="true" aria-labelledby="titulo-minha-senha"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-elevada animate-subir">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca-50 text-marca-600"><KeyRound size={22} /></span>
          <div className="min-w-0 flex-1">
            <h3 id="titulo-minha-senha" className="font-display text-lg font-bold text-tinta-950">Trocar minha senha</h3>
            <p className="text-sm text-tinta-500">Vale para o próximo login.</p>
          </div>
          <button type="button" onClick={sair} className="grid size-8 place-items-center rounded-lg text-tinta-400 hover:bg-tinta-100 hover:text-tinta-900" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {erro && <div className="fw-alerta-erro" role="alert">{erro}</div>}
          {campo('senha-atual', 'Senha atual', atual, setAtual, 'current-password')}
          {campo('senha-nova', 'Nova senha', nova, setNova, 'new-password')}
          <p className="-mt-2 text-xs text-tinta-500">{REGRA_SENHA}</p>
          {campo('senha-nova-2', 'Repita a nova senha', confirmacao, setConfirmacao, 'new-password')}
          <button type="button" onClick={() => setMostrar((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-tinta-500 hover:text-tinta-800">
            {mostrar ? <EyeOff size={14} /> : <Eye size={14} />} {mostrar ? 'Esconder as senhas' : 'Mostrar as senhas'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="fw-btn-contorno" onClick={sair}>Cancelar</button>
          <button type="submit" disabled={enviando} className="fw-btn-primario">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
