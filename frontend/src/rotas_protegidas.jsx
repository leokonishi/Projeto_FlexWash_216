import { Navigate } from 'react-router-dom';
import { obterSessao, encerrarSessao } from './utils/sessao';

// Uso: <RotaProtegida perfisPermitidos={['administrador', 'funcionario']}>...</RotaProtegida>
// Sem token (ou token expirado) -> login. Perfil não permitido -> a "home" do próprio perfil.
export default function RotaProtegida({ children, perfisPermitidos }) {
  const sessao = obterSessao();

  if (!sessao) {
    encerrarSessao(); // limpa token expirado/corrompido
    const soCliente = perfisPermitidos?.length === 1 && perfisPermitidos[0] === 'cliente';
    return <Navigate to={soCliente ? '/login' : '/gestao/LoginGestao'} replace />;
  }

  if (perfisPermitidos && !perfisPermitidos.includes(sessao.perfil)) {
    return <Navigate to={sessao.perfil === 'cliente' ? '/PaginaCliente' : '/painel'} replace />;
  }

  return children;
}
