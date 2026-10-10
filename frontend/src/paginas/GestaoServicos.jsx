import React, { useState } from 'react';
import '../paginas_css/painel_controle.css';

// Importando os nossos componentes
import ModalConfirmacao from "../componentes/ModalConfirmacao";
import SecaoPacotes from '../componentes/ConfiguracoesAdm/SecaoPacotes';
import SecaoExtras from '../componentes/ConfiguracoesAdm/SecaoExtras';

export default function GestaoServicos() {
  // Estado centralizado para o Modal de Alerta
  const [alerta, setAlerta] = useState({
    isOpen: false,
    titulo: '',
    mensagem: '',
    onConfirm: null,
    tipo: 'aviso'
  });

  // Função que os componentes filhos chamarão para abrir o alerta
  const abrirAlerta = (titulo, mensagem, onConfirm, tipo = 'aviso') => {
    setAlerta({
      isOpen: true,
      titulo,
      mensagem,
      onConfirm: () => {
        onConfirm(); // Executa a ação do filho
        fecharAlerta(); // Fecha o alerta
      },
      tipo
    });
  };

  const fecharAlerta = () => {
    setAlerta(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      {/* Cabeçalho atualizado sem mencionar "marcas" */}
      <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Painel de Serviços e Valores
        </h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
          Cadastre, edite e remova pacotes de lavagem e serviços adicionais do seu lava-rápido.
        </p>
      </div>

      {/* Grid de 2 Colunas Equilibrado */}
      <div className="painel-controle-layout">
   
        {/* Coluna Esquerda */}
        <aside>
          <SecaoPacotes abrirAlerta={abrirAlerta} />
        </aside>

        {/* Coluna Direita */}
        <main>
          <SecaoExtras abrirAlerta={abrirAlerta} />
        </main>

      </div>

      {/* Renderiza o Modal de Confirmação por cima de tudo quando for chamado */}
      <ModalConfirmacao
        isOpen={alerta.isOpen}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        onConfirm={alerta.onConfirm}
        onCancel={fecharAlerta}
        tipo={alerta.tipo}
      />
    </>
  );
}