import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../paginas_css/pagina_admin.css';

// Importação dos Componentes Filhos (Padrão de Arquitetura Limpa)
import DashboardInicio from '../componentes/DashboardInicio';
import GestaoClientes from './GestaoClientes';
import GestaoFuncionarios from './GestaoFuncionarios';
import GestaoServicos from './GestaoServicos';
import Historico from './Historico'; // 1. IMPORTAÇÃO DO HISTÓRICO ADICIONADA AQUI
import ModalConfirmacao from '../componentes/ModalConfirmacao';

export default function PaginaAdmin() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const perfilUsuario = localStorage.getItem('perfil_flexwash') || 'funcionario';

  // --- CONTROLO GLOBAL DO MODAL DE ALERTA ---
  const [alerta, setAlerta] = useState({ isOpen: false, titulo: '', mensagem: '', onConfirm: null, tipo: 'aviso' });

  const abrirAlerta = (titulo, mensagem, onConfirm, tipo = 'aviso') => {
    setAlerta({ isOpen: true, titulo, mensagem, onConfirm: () => { onConfirm(); fecharAlerta(); }, tipo });
  };
  const fecharAlerta = () => setAlerta(prev => ({ ...prev, isOpen: false }));
  // ------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem('token_flexwash');
    localStorage.removeItem('perfil_flexwash');
    navigate('/login');
  };

  const handleEmBreve = (nomeMenu) => {
    abrirAlerta('Em Desenvolvimento', `A secção "${nomeMenu}" estará disponível em breve!`, () => {}, 'aviso');
  };

  return (
    <div className="admin-layout-claro">
      {/* Topo / Header Claro */}
      <header className="header-claro">
        <div className="brand-claro">FLEX WASH</div>
        <div className="header-right-claro">
          <div className="user-profile-claro">
            <div className="user-text-claro">
              <strong>Equipe Flex</strong>
              <small>{perfilUsuario === 'administrador' ? 'ADMINISTRADOR' : 'OPERADOR DE PÁTIO'}</small>
            </div>
            <div className="user-avatar-claro">{perfilUsuario === 'administrador' ? 'ADM' : 'OP'}</div>
          </div>
          <button onClick={handleLogout} className="btn-sair-claro">Sair</button>
        </div>
      </header>

      <div className="corpo-dashboard-claro">
        {/* Sidebar Esquerda Branca */}
        <aside className="sidebar-claro">
          <div className="nav-titulo-claro">NAVEGAÇÃO</div>
          <button className={abaAtiva === 'inicio' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'} onClick={() => setAbaAtiva('inicio')}>Início</button>
          <button className={abaAtiva === 'clientes' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'} onClick={() => setAbaAtiva('clientes')}>Clientes</button>
          
          {/* 2. BOTÃO DO HISTÓRICO ATUALIZADO PARA MUDAR A ABA */}
          <button className={abaAtiva === 'historico' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'} onClick={() => setAbaAtiva('historico')}>Histórico / Relatórios</button>

          {/* TRAVA DE SEGURANÇA NO MENU */}
          {perfilUsuario === 'administrador' && (
            <>
              <div className="nav-titulo-claro separator">PAINEL DE CONTROLE</div>
              <button className={abaAtiva === 'servicos' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'} onClick={() => setAbaAtiva('servicos')}>Serviços e Valores</button>
              <button className={abaAtiva === 'funcionarios' ? 'sidebar-btn-claro ativo' : 'sidebar-btn-claro'} onClick={() => setAbaAtiva('funcionarios')}>Funcionários (Comissões)</button>
            </>
          )}
        </aside>

        {/* Conteudo Principal */}
        <main className="main-claro">
          
          {/* Sub-menu Mobile */}
          <div className="subnav-tabs-claro">
            <button className={abaAtiva === 'inicio' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'} onClick={() => setAbaAtiva('inicio')}>Início</button>
            <button className={abaAtiva === 'clientes' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'} onClick={() => setAbaAtiva('clientes')}>Clientes</button>
            <button className={abaAtiva === 'historico' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'} onClick={() => setAbaAtiva('historico')}>Histórico</button>
            
            {perfilUsuario === 'administrador' && (
              <>
                <button className={abaAtiva === 'funcionarios' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'} onClick={() => setAbaAtiva('funcionarios')}>Comissões</button>
                <button className={abaAtiva === 'servicos' ? 'subtab-btn-claro ativo' : 'subtab-btn-claro'} onClick={() => setAbaAtiva('servicos')}>Serviços</button>
              </>
            )}
          </div>

          {/* ----- RENDERIZAÇÃO CONDICIONAL DAS TELAS ----- */}
          {abaAtiva === 'inicio' && <DashboardInicio perfilUsuario={perfilUsuario} />}
          
          {abaAtiva === 'clientes' && <GestaoClientes abrirAlerta={abrirAlerta} />}
          
          {/* 3. CHAMADA DO COMPONENTE DE HISTÓRICO ADICIONADA AQUI */}
          {abaAtiva === 'historico' && <Historico abrirAlerta={abrirAlerta} />}
          
          {abaAtiva === 'funcionarios' && perfilUsuario === 'administrador' && <GestaoFuncionarios abrirAlerta={abrirAlerta} />}
          
          {abaAtiva === 'servicos' && perfilUsuario === 'administrador' && <GestaoServicos />}
          {/* ---------------------------------------------- */}

          {/* Botão Flutuante Inferior Direito */}
          <button className="btn-nova-lavagem-flutuante-claro" onClick={() => handleEmBreve('Nova Lavagem')}>+ Nova Lavagem</button>
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