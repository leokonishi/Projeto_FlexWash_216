import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, Tag } from 'lucide-react';

export default function SecaoExtras({ abrirAlerta }) {
  const [extras, setExtras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoPequeno, setPrecoPequeno] = useState('');
  const [precoMedio, setPrecoMedio] = useState('');
  const [precoGrande, setPrecoGrande] = useState('');
  const [comissao, setComissao] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // 1. Busca os dados reais do Banco de Dados
  const buscarExtras = async () => {
    try {
      setCarregando(true);
      const res = await fetch(`${API_URL}/api/extras`);
      if (res.ok) setExtras(await res.json());
    } catch (erro) {
      console.error("Erro ao buscar extras:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarExtras();
  }, []);

  // 2. Salva um novo Extra no Banco de Dados
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nome || !precoPequeno || !precoMedio || !precoGrande) {
      abrirAlerta('Atenção', 'Preencha o nome e os preços para os 3 portes.', () => {}, 'aviso');
      return;
    }

    const novoExtra = {
      nome,
      descricao,
      preco_pequeno: Number(precoPequeno),
      preco_medio: Number(precoMedio),
      preco_grande: Number(precoGrande),
      comissao_porcentagem: Number(comissao || 0)
    };

    try {
      const res = await fetch(`${API_URL}/api/extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoExtra)
      });

      if (res.ok) {
        abrirAlerta('Sucesso', 'Serviço adicional cadastrado!', () => {}, 'aviso');
        setModalAberto(false);
        setNome(''); setDescricao(''); setPrecoPequeno(''); setPrecoMedio(''); setPrecoGrande(''); setComissao('');
        buscarExtras(); // Recarrega a lista
      }
    } catch (erro) {
      abrirAlerta('Erro', 'Falha ao conectar com o servidor.', () => {}, 'perigo');
    }
  };

  // 3. Deleta um Extra
  const handleExcluir = (id, nomeItem) => {
    abrirAlerta(
      'Excluir Serviço',
      `Deseja excluir "${nomeItem}"? Isso removerá a opção das novas lavagens.`,
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/extras/${id}`, { method: 'DELETE' });
          if (res.ok) buscarExtras();
        } catch (erro) {
          console.error(erro);
        }
      },
      'perigo'
    );
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag color="#3b82f6" /> SERVIÇOS ADICIONAIS (EXTRAS)
        </h3>
        <button 
          onClick={() => setModalAberto(true)}
          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <PlusCircle size={16} /> Novo Adicional
        </button>
      </div>

      {carregando ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>A carregar serviços...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {extras.length === 0 ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum serviço extra cadastrado no sistema.</div>
          ) : (
            extras.map(extra => (
              <div key={extra.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem' }}>{extra.nome}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><Edit2 size={14}/></button>
                      <button onClick={() => handleExcluir(extra.id, extra.nome)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>{extra.descricao || 'Sem descrição.'}</p>
                </div>
                
                {/* Visual Premium para os Preços por Porte */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', border: '1px solid #f1f5f9' }}>
                  <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#475569' }}>P</strong> R$ {Number(extra.preco_pequeno).toFixed(2)}</div>
                  <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#475569' }}>M</strong> R$ {Number(extra.preco_medio).toFixed(2)}</div>
                  <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#475569' }}>G</strong> R$ {Number(extra.preco_grande).toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Comissão: <strong style={{ color: '#0f172a' }}>{Number(extra.comissao_porcentagem)}%</strong></div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Cadastrar Novo Serviço Extra</h3>
            <form onSubmit={handleSalvar}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>NOME DO SERVIÇO</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>DESCRIÇÃO BREVE</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>

              {/* Tabela de Preços por Porte no Modal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold' }}>PREÇO (P)</label>
                  <input type="number" step="0.01" value={precoPequeno} onChange={e => setPrecoPequeno(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold' }}>PREÇO (M)</label>
                  <input type="number" step="0.01" value={precoMedio} onChange={e => setPrecoMedio(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold' }}>PREÇO (G)</label>
                  <input type="number" step="0.01" value={precoGrande} onChange={e => setPrecoGrande(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>% DE COMISSÃO</label>
                <input type="number" step="0.1" value={comissao} onChange={e => setComissao(e.target.value)} placeholder="Ex: 5" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Serviço</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}