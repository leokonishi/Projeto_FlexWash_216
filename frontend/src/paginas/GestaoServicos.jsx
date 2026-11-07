import React from 'react';

import SecaoPacotes from '../componentes/ConfiguracoesAdm/SecaoPacotes';
import SecaoExtras from '../componentes/ConfiguracoesAdm/SecaoExtras';
import CabecalhoPagina from '../componentes/ui/CabecalhoPagina';

// O modal de confirmação/aviso é o global do painel (pagina_admin), recebido em `abrirAlerta`.
export default function GestaoServicos({ abrirAlerta }) {
  return (
    <div className="mx-auto max-w-7xl">
      <CabecalhoPagina
        titulo="Serviços e valores"
        subtitulo="Cadastre, edite e remova pacotes de lavagem e serviços adicionais. O preço muda conforme o porte do carro."
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SecaoPacotes abrirAlerta={abrirAlerta} />
        <SecaoExtras abrirAlerta={abrirAlerta} />
      </div>
    </div>
  );
}
