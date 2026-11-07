import React, { useState } from 'react';

// Importando os nossos componentes
import ModalConfirmacao from "../componentes/ModalConfirmacao";
import SecaoPacotes from '../componentes/ConfiguracoesAdm/SecaoPacotes';
import SecaoExtras from '../componentes/ConfiguracoesAdm/SecaoExtras';
import CabecalhoPagina from '../componentes/ui/CabecalhoPagina';

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
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina
        titulo="Serviços e valores"
        subtitulo="Cadastre e remova pacotes de lavagem e serviços adicionais. O preço muda conforme o porte do carro."
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SecaoPacotes abrirAlerta={abrirAlerta} />
        <SecaoExtras abrirAlerta={abrirAlerta} />
      </div>

      {/* Modal de confirmação por cima de tudo quando for chamado */}
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
