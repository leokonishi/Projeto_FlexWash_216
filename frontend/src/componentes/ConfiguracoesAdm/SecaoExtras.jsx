import React from 'react';
import { Sparkles } from 'lucide-react';
import CatalogoServicos from './CatalogoServicos';

const TEXTOS = {
  titulo: 'Extras',
  subtitulo: 'Adicionais somados ao pacote.',
  botaoNovo: 'Novo extra',
  vazio: 'Nenhum serviço extra cadastrado no sistema.',
  tituloModal: 'Novo serviço extra',
  exemploNome: 'Ex: Cera líquida',
  sucesso: 'Serviço adicional cadastrado!',
  tituloEditar: 'Editar serviço extra',
  sucessoEdicao: 'Serviço adicional atualizado!',
  tituloExcluir: 'Excluir Serviço',
};

export default function SecaoExtras({ abrirAlerta }) {
  return <CatalogoServicos abrirAlerta={abrirAlerta} rota="/api/extras" icone={Sparkles} textos={TEXTOS} />;
}
