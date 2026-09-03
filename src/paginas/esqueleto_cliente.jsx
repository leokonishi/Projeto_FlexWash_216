import { useState } from 'react';
import '../paginas_css/esqueleto_cliente.css';

export default function DashboardCliente() {
  // Estado simulando os dados do cliente que virão do banco
  const [dadosCliente] = useState({
    nome: 'Alexandre Santos',
    fidelidadeAtual: 0,
    fidelidadeMeta: 10,
    statusCarro: 'Nenhum veículo',
    ultimaVisita: '--/--/----'
  });

  return (
    <div className="container-dashboard-cliente">
      
      {/* Menu Lateral */}
      <aside className="menu-lateral-cliente">
        <div className="cabecalho-menu">
          <div className="logo-icone">FW</div>
          <div className="logo-texto">
            <h2 className="titulo-logo">FlexWash</h2>
            <p className="subtitulo-logo">Portal Cliente</p>
          </div>
        </div>

        <div className="cartao-perfil">
          <div className="avatar-usuario">AS</div>
          <div className="info-usuario">
            <p className="nome-usuario">{dadosCliente.nome}</p>
            <p className="tipo-usuario">Cliente Standard</p>
          </div>
        </div>

        <nav className="navegacao-menu">
          <p className="titulo-navegacao">Workspace</p>
          <a href="#" className="link-menu ativo">Visão Geral</a>
          <a href="#" className="link-menu">Meus Veículos</a>
          <a href="#" className="link-menu">Histórico (Em breve)</a>
        </nav>

        <div className="rodape-menu">
          <a href="/login" className="link-sair">Sair da conta</a>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="conteudo-principal-cliente">
        
        <header className="cabecalho-pagina">
          <span className="migalha-pao">FLEXWASH • PORTAL</span>
          <h1 className="titulo-pagina">Visão geral — Cliente</h1>
          <p className="descricao-pagina">Acompanhe seus veículos e o progresso do seu programa de fidelidade.</p>
        </header>

        <section className="banner-informativo">
          <p className="tag-sprint">SPRINT 1 • FUNDAÇÃO VISUAL</p>
          <h2 className="titulo-banner">Bem-vindo ao seu painel, {dadosCliente.nome.split(' ')[0]}.</h2>
          <p className="descricao-banner">Os indicadores abaixo mostram a estrutura do seu perfil no FlexWash.</p>
        </section>

        <section className="secao-indicadores">
          <h3 className="titulo-secao">Acompanhamento</h3>
          
          <div className="grid-cartoes">
            
            {/* Cartão 1: Status do Carro */}
            <div className="cartao-indicador">
              <span className="etiqueta-cartao">Estrutural</span>
              <h4 className="titulo-cartao">Status Atual</h4>
              <p className="valor-cartao destaque-azul">{dadosCliente.statusCarro}</p>
              <p className="legenda-cartao">No pátio agora</p>
            </div>

            {/* Cartão 2: Programa Fidelidade */}
            <div className="cartao-indicador">
              <span className="etiqueta-cartao">Estrutural</span>
              <h4 className="titulo-cartao">Programa Fidelidade</h4>
              <p className="valor-cartao destaque-roxo">
                {dadosCliente.fidelidadeAtual} / {dadosCliente.fidelidadeMeta}
              </p>
              <p className="legenda-cartao">Lavagens acumuladas</p>
            </div>

            {/* Cartão 3: Última Visita */}
            <div className="cartao-indicador">
              <span className="etiqueta-cartao">Estrutural</span>
              <h4 className="titulo-cartao">Última Visita</h4>
              <p className="valor-cartao">{dadosCliente.ultimaVisita}</p>
              <p className="legenda-cartao">Aguardando dados</p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}