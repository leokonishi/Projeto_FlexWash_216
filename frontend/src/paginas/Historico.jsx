import React, { useState, useEffect } from 'react';
import { Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import '../paginas_css/gestao_clientes.css'; // Usando o mesmo CSS da tabela de clientes para manter o padrão

export default function Historico({ abrirAlerta }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const perfilUsuario = localStorage.getItem('perfil_flexwash') || 'funcionario';

  const buscarHistorico = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/api/execucoes/historico`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token_flexwash')}` }
      });
      
      if (resposta.ok) {
        const dados = await resposta.json();
        setHistorico(dados);
      }
    } catch (erro) {
      console.error("Erro ao buscar histórico:", erro);
      if (abrirAlerta) abrirAlerta('Erro', 'Não foi possível carregar o histórico.', () => {}, 'perigo');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarHistorico();
  }, []);

  const handleExcluirRegistro = (id) => {
    if (abrirAlerta) {
      abrirAlerta(
        'Apagar Registro',
        `Tem certeza que deseja apagar este histórico (#${id})? Esta ação não pode ser desfeita.`,
        async () => {
          try {
            const resposta = await fetch(`${API_URL}/api/execucoes/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
              setHistorico(historico.filter(item => item.id !== id));
            }
          } catch (erro) {
            console.error(erro);
          }
        },
        'perigo'
      );
    } else {
      if (window.confirm('Tem certeza que deseja apagar este registro?')) {
        // Fallback caso o abrirAlerta não seja passado
      }
    }
  };

  // Funções placeholder para os botões de exportação (podem ser implementadas depois)
  const handleExportarExcel = () => alert('A exportação para Excel será implementada em breve!');
  const handleExportarPDF = () => alert('A exportação para PDF será implementada em breve!');

  return (
    <div className="clientes-layout" style={{ display: 'block', padding: '2rem' }}>
      <main style={{ width: '100%' }}>
        <div className="clientes-card" style={{ width: '100%' }}>
          
          {/* Cabeçalho da Página */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 className="clientes-card-titulo" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                Relatório Geral de Atendimentos
              </h2>
              <p className="clientes-card-subtitulo">
                Visualização retroativa e exportação de todas as lavagens registradas.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleExportarExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <FileSpreadsheet size={18} /> Exportar Excel / CSV
              </button>
              <button 
                onClick={handleExportarPDF}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <FileText size={18} /> Exportar Relatório PDF
              </button>
            </div>
          </div>
          
          {/* Tabela de Histórico */}
          <div className="tabela-clientes-wrapper">
            {carregando ? (
               <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>A carregar histórico de serviços...</div>
            ) : (
              <table className="tabela-clientes">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>VEÍCULO</th>
                    <th>PLACA</th>
                    <th>CLIENTE</th>
                    <th>SERVIÇO / EXTRAS</th>
                    <th>VALOR TOTAL</th>
                    <th>RESPONSÁVEIS</th>
                    <th>STATUS FINAL</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: '#94a3b8', fontWeight: 'bold' }}>#{item.id}</td>
                      <td>
                        <strong>{item.marca} {item.modelo}</strong>
                        <span className="sub-texto" style={{ display: 'block' }}>Porte: {item.porte}</span>
                      </td>
                      <td><strong>{item.placa}</strong></td>
                      <td>{item.cliente_nome}</td>
                      <td>
                        <strong>{item.pacote_nome || 'Serviço Avulso'}</strong>
                        <span className="sub-texto" style={{ display: 'block', marginTop: '4px' }}>
                          Adicionais: {item.servicos_extras || 'Nenhum'}
                        </span>
                      </td>
                      <td>
                        <strong>R$ {Number(item.valor_total || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span className="sub-texto" style={{ marginTop: 0 }}>
                          {item.responsaveis || 'Não atribuído'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', width: 'fit-content' }}>
                            Concluído
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Data: {new Date(item.data_entrada).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td>
                        {perfilUsuario === 'administrador' && (
                          <button 
                            className="pc-btn-acao" 
                            onClick={() => handleExcluirRegistro(item.id)}
                            title="Apagar do histórico"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{textAlign: 'center', padding: '3rem', color: '#64748b'}}>
                        Nenhum serviço finalizado até ao momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}