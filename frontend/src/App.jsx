import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Importações - Área do Cliente
import Login from './paginas/Login';
import CadastroCliente from './paginas/cadastro_cliente';
import DefinirSenha from './paginas/DefinirSenha';
import PaginaCliente from './paginas/PaginaCliente';
import Historico from './paginas/Historico';

import LoginGestao from './paginas/gestao/LoginGestao';
import EsqueletoAdmin from './paginas/pagina_admin'; // Este é o seu painel principal
import RotaProtegida from './rotas_protegidas';

// Endereços antigos continuam funcionando: redireciona mantendo ?query e #hash
// (ex.: link de "definir senha" já enviado ao cliente com ?token=...).
function Redirecionar({ para }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${para}${search}${hash}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />

        {/* ---------- Área do Cliente: /cliente ---------- */}
        <Route
          path="/cliente"
          element={
            <RotaProtegida perfisPermitidos={['cliente']}>
              <PaginaCliente />
            </RotaProtegida>
          }
        />
        <Route path="/cliente/login" element={<Login />} />
        <Route path="/cliente/cadastro" element={<CadastroCliente />} />
        <Route path="/cliente/definir-senha" element={<DefinirSenha />} />

        {/* ---------- Área de Gestão (admin + pátio): /gestao ---------- */}
        <Route
          path="/gestao"
          element={
            <RotaProtegida perfisPermitidos={['administrador', 'funcionario']}>
              <EsqueletoAdmin />
            </RotaProtegida>
          }
        />
        <Route path="/gestao/login" element={<LoginGestao />} />
        <Route
          path="/gestao/historico"
          element={
            <RotaProtegida perfisPermitidos={['administrador', 'funcionario']}>
              <Historico />
            </RotaProtegida>
          }
        />

        {/* ---------- Endereços antigos (redirecionam para os novos) ---------- */}
        <Route path="/login" element={<Redirecionar para="/cliente/login" />} />
        <Route path="/cadastro" element={<Redirecionar para="/cliente/cadastro" />} />
        <Route path="/definir-senha" element={<Redirecionar para="/cliente/definir-senha" />} />
        <Route path="/PaginaCliente" element={<Redirecionar para="/cliente" />} />
        <Route path="/painel" element={<Redirecionar para="/gestao" />} />
        <Route path="/historico" element={<Redirecionar para="/gestao/historico" />} />
        <Route path="/gestao/LoginGestao" element={<Redirecionar para="/gestao/login" />} />

        {/* Qualquer outro endereço cai na área do cliente */}
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
