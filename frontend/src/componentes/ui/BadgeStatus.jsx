// Etiqueta de status de um serviço (Agendado, Aguardando, Em Andamento, Finalizado, Cancelado)
const ESTILOS = {
  Agendado: { classe: 'bg-marca-50 text-marca-700 ring-marca-200', ponto: 'bg-marca-500', texto: 'Agendado' },
  Aguardando: { classe: 'bg-ouro-50 text-ouro-700 ring-ouro-200', ponto: 'bg-ouro-400', texto: 'No pátio' },
  'Em Andamento': { classe: 'bg-marca-600 text-white ring-marca-600', ponto: 'bg-white animate-pulse', texto: 'Lavando' },
  Cancelado: { classe: 'bg-tinta-100 text-tinta-500 ring-tinta-200', ponto: 'bg-tinta-400', texto: 'Cancelado' },
};
const CONCLUIDO = { classe: 'bg-verde-50 text-verde-700 ring-verde-200', ponto: 'bg-verde-500', texto: 'Concluído' };

export default function BadgeStatus({ status }) {
  const estilo = ESTILOS[status] || CONCLUIDO;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilo.classe}`}>
      <span className={`size-1.5 rounded-full ${estilo.ponto}`} />
      {estilo.texto}
    </span>
  );
}
