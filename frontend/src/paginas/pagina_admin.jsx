import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, History, Package, Truck, BadgeDollarSign, LogOut, Ticket } from 'lucide-react';

// Importação dos Componentes Filhos (Padrão de Arquitetura Limpa)
import DashboardInicio from '../componentes/DashboardInicio';
import GestaoClientes from './GestaoClientes';
import GestaoFuncionarios from './GestaoFuncionarios';
import GestaoServicos from './GestaoServicos';
import GestaoPromocoes from './GestaoPromocoes';
// Carregada só quando a aba é aberta: o mapa 3D (MapLibre) é pesado
const GestaoLevaTras = lazy(() => import('./GestaoLevaTras'));
import Historico from './Historico';
import ModalConfirmacao from '../componentes/ModalConfirmacao';
import Logo from '../componentes/ui/Logo';
import { obterPerfil, encerrarSessao } from '../utils/sessao';

// Abas do painel. `admin`: só aparece para o administrador.
const ABAS = [
  { id: 'inicio', nome: 'Pátio', icone: LayoutGrid },
  { id: 'clientes', nome: 'Clientes', icone: Users },
  { id: 'historico', nome: 'Histórico', nomeLongo: 'Histórico / Relatórios', icone: History },
  { id: 'servicos', nome: 'Serviços', icone: Package, admin: true },
  { id: 'promocoes', nome: 'Promoções', nomeLongo: 'Fidelidade e promoções', icone: Ticket, admin: true },
  { id: 'levatras', nome: 'Leva e Traz', icone: Truck, admin: true },
  { id: 'funcionarios', nome: 'Equipe', nomeLongo: 'Funcionários', icone: BadgeDollarSign, admin: true },
];

export default function PaginaAdmin() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const perfilUsuario = obterPerfil() || 'funcionario'; // lido do token, não do localStorage editável
  const ehAdmin = perfilUsuario === 'administrador';
  const abasVisiveis = ABAS.filter(a => !a.admin || ehAdmin);

  // --- CONTROLE GLOBAL DO MODAL DE ALERTA ---
  // Fecha antes de executar a ação: assim a ação pode abrir outro alerta (erro, 2ª confirmação) sem ele sumir.
  const [alerta, setAlerta] = useState({ isOpen: false, titulo: '', mensagem: '', onConfirm: null, tipo: 'aviso' });

  const abrirAlerta = (titulo, mensagem, onConfirm, tipo = 'aviso') => {
    setAlerta({ isOpen: true, titulo, mensagem, onConfirm: () => { fecharAlerta(); onConfirm(); }, tipo });
  };
  const fecharAlerta = () => setAlerta(prev => ({ ...prev, isOpen: false }));
  // ------------------------------------------

  const handleLogout = () => {
    encerrarSessao();
    navigate('/gestao/LoginGestao');
  };

  const botaoAba = (aba, compacto) => {
    const ativo = abaAtiva === aba.id;
    const Icone = aba.icone;
    if (compacto) {
      return (
        <button
          key={aba.id}
          onClick={() => setAbaAtiva(aba.id)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
            ativo ? 'bg-tinta-950 text-white' : 'bg-white text-tinta-600 ring-1 ring-tinta-200'
          }`}
        >
          <Icone size={15} /> {aba.nome}
        </button>
      );
    }
    return (
      <button
        key={aba.id}
        onClick={() => setAbaAtiva(aba.id)}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          ativo ? 'bg-marca-50 font-semibold text-marca-700' : 'text-tinta-600 hover:bg-tinta-100 hover:text-tinta-900'
        }`}
      >
        <Icone size={18} className={ativo ? 'text-marca-600' : 'text-tinta-400 group-hover:text-tinta-600'} />
        {aba.nomeLongo || aba.nome}
      </button>
    );
  };

  return (
    <div className="fw-app flex min-h-[100dvh]">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-tinta-200/70 bg-white px-4 py-5 lg:flex">
        <div className="px-2"><Logo tamanho="sm" /></div>

        <nav className="mt-8 flex-1 space-y-1">
          <p className="fw-rotulo-secao mb-2 px-3">Operação</p>
          {abasVisiveis.filter(a => !a.admin).map(a => botaoAba(a, false))}
          {ehAdmin && (
            <>
              <p className="fw-rotulo-secao mb-2 mt-6 px-3">Painel de controle</p>
              {abasVisiveis.filter(a => a.admin).map(a => botaoAba(a, false))}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 rounded-2xl bg-tinta-50 p-3 ring-1 ring-tinta-200/70">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta-950 text-xs font-bold text-ouro-300">
            {ehAdmin ? 'ADM' : 'OP'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-tinta-900">Equipe Flex</p>
            <p className="truncate text-xs text-tinta-500">{ehAdmin ? 'Administrador' : 'Operador de pátio'}</p>
          </div>
          <button onClick={handleLogout} className="grid size-8 place-items-center rounded-lg text-tinta-400 hover:bg-white hover:text-tinta-900" aria-label="Sair" title="Sair">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular e tablet) */}
        <header className="sticky top-0 z-40 border-b border-tinta-200/70 bg-white/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo tamanho="sm" />
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-tinta-100 px-2.5 py-1 text-xs font-semibold text-tinta-600">
                {ehAdmin ? 'Administrador' : 'Operador'}
              </span>
              <button onClick={handleLogout} className="fw-btn-fantasma h-9 px-2" aria-label="Sair"><LogOut size={18} /></button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {abasVisiveis.map(a => botaoAba(a, true))}
          </nav>
        </header>

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {abaAtiva === 'inicio' && <DashboardInicio perfilUsuario={perfilUsuario} abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'clientes' && <GestaoClientes abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'historico' && <Historico abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'funcionarios' && ehAdmin && <GestaoFuncionarios abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'servicos' && ehAdmin && <GestaoServicos abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'promocoes' && ehAdmin && <GestaoPromocoes abrirAlerta={abrirAlerta} />}

          {abaAtiva === 'levatras' && ehAdmin && (
            <Suspense fallback={<div className="p-8 text-center text-tinta-500">Carregando o mapa...</div>}>
              <GestaoLevaTras />
            </Suspense>
          )}
        </main>
      </div>

      {/* MODAL GLOBAL REUTILIZÁVEL */}
      <ModalConfirmacao
        isOpen={alerta.isOpen}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        onConfirm={alerta.onConfirm}
        onCancel={fecharAlerta}
        tipo={alerta.tipo}
      />
    </div>
  );
}
