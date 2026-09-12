import { useState, useEffect } from 'react';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './paginas/Login';
import CadastroCliente from './paginas/cadastro_cliente';
import EsqueletoAdmin from './paginas/pagina_admin';
import RotaProtegida from './rotas_protegidas';

export default function App() {
  // Estado para guardar a mensagem que vem do backend
  const [mensagemBackend, setMensagemBackend] = useState('');

  useEffect(() => {
    // Tenta conectar com a API na porta 3000
    fetch(`${import.meta.env.VITE_API_URL}/`)
      .then(resposta => resposta.json())
      .then(dados => setMensagemBackend(dados.message))
      .catch(erro => {
        console.error('Erro de CORS ou Conexão:', erro);
        setMensagemBackend('Erro ao conectar com a API');
      });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redireciona a raiz "/" direto para a tela de login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroCliente />} />

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