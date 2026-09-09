import { Navigate } from 'react-router-dom';

export default function RotaProtegida({ children }) {
  const estaAutenticado = localStorage.getItem('token_flexwash');

  if (!estaAutenticado) {
    // Dispara o alerta informando a restrição de acesso
    alert("Acesso negado! Por favor, faça login para acessar esta página.");
    
    // Redireciona para o login
    return <Navigate to="/login" replace />;
  }

  return children;
}