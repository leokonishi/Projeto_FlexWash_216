import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './paginas/Login';
import CadastroCliente from './paginas/cadastro_cliente';
import EsqueletoAdmin from './paginas/pagina_admin';
import RotaProtegida from './rotas_protegidas'
import LoginGestao from './paginas/gestao/LoginGestao';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redireciona a raiz "/" direto para a tela de login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroCliente />} />
        <Route path="/gestao/LoginGestao" element={<LoginGestao />} />
        {/* Rota Protegida do Administrador */}
        <Route 
          path="/admin" 
          element={
            <RotaProtegida>
              <EsqueletoAdmin />
            </RotaProtegida>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}