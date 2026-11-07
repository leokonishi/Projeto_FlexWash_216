import React from 'react';
import { Droplets } from 'lucide-react';
import CatalogoServicos from './CatalogoServicos';

const TEXTOS = {
  titulo: 'Pacotes de lavagem',
  subtitulo: 'O serviço principal de cada lavagem.',
  botaoNovo: 'Novo pacote',
  vazio: 'Nenhum pacote cadastrado.',
  tituloModal: 'Novo pacote de lavagem',
  exemploNome: 'Ex: Lavagem Completa',
  sucesso: 'Pacote de lavagem cadastrado!',
  tituloEditar: 'Editar pacote de lavagem',
  sucessoEdicao: 'Pacote de lavagem atualizado!',
  tituloExcluir: 'Excluir Pacote',
};

export default function SecaoPacotes({ abrirAlerta }) {
  return <CatalogoServicos abrirAlerta={abrirAlerta} rota="/api/pacotes" icone={Droplets} textos={TEXTOS} />;
}
