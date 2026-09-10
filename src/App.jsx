import React, { useState, useEffect } from 'react';
import Login from './paginas/cadastro_cliente';

export default function App() {
  // Estado para guardar a mensagem que vem do backend
  const [mensagemBackend, setMensagemBackend] = useState('');

  useEffect(() => {
    // Tenta conectar com a API na porta 3000
    fetch('http://localhost:3000/')
      .then(resposta => resposta.json())
      .then(dados => setMensagemBackend(dados.message))
      .catch(erro => {
        console.error('Erro de CORS ou Conexão:', erro);
        setMensagemBackend('Erro ao conectar com a API');
      });
  }, []);

  return (
    <div>
      {/* BARRA DE TESTE - Você pode apagar esta div inteira depois */}
      <div style={{ backgroundColor: '#222', color: '#fff', padding: '10px', textAlign: 'center' }}>
        Status do Servidor: <strong style={{ color: mensagemBackend.includes('Erro') ? '#ff4444' : '#00C851' }}>
          {mensagemBackend || 'Conectando...'}
        </strong>
      </div>

      {/* Sua tela de cadastro original continua renderizando normalmente aqui */}
      <Login />
    </div>
  );
}