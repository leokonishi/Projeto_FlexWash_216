import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importações - Área do Cliente
import Login from './paginas/Login';
import CadastroCliente from './paginas/cadastro_cliente';
import PaginaCliente from './paginas/PaginaCliente';
import Historico from './paginas/Historico'; // (Ajuste o caminho conforme a sua estrutura)

import LoginGestao from './paginas/gestao/LoginGestao';
import EsqueletoAdmin from './paginas/pagina_admin'; // Este é o seu painel principal
import RotaProtegida from './rotas_protegidas';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroCliente />} />
        <Route path="/PaginaCliente" element={<PaginaCliente />} />
        <Route path="/historico" element={<Historico />} />
    
        <Route path="/gestao/LoginGestao" element={<LoginGestao />} />

    
        <Route 
          path="/painel" 
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