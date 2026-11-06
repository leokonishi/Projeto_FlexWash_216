import React, { useEffect, useState } from 'react';
import { Truck, MapPin, Save, ExternalLink } from 'lucide-react';
import { apiFetch, API_URL } from '../utils/api';

// Tela do gerente: endereço do lava-rápido, raio máximo atendido (km) e valor por veículo.
// O backend acha o endereço no mapa ao salvar; o cliente só vê o leva e traz (com o valor)
// quando a distância de carro até o endereço dele cabe no raio.
const campo = { width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' };
const rotulo = { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#334155' };

const linkMapa = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

export default function GestaoLevaTras() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }

  const [endereco, setEndereco] = useState('');
  const [raio, setRaio] = useState('');
  const [taxa, setTaxa] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvo, setSalvo] = useState(null); // configuração que está no banco

  const preencher = (config) => {
    setSalvo(config);
    if (!config) return;
    setEndereco(config.endereco_lava_rapido || '');
    setRaio(config.raio_km ?? '');
    setTaxa(config.taxa_por_veiculo ?? '');
    setAtivo(Boolean(config.ativo));
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/admin/logistica`);
        if (res.ok) preencher(await res.json());
        else setAviso({ tipo: 'erro', texto: 'Não foi possível carregar a configuração do leva e traz.' });
      } catch {
        setAviso({ tipo: 'erro', texto: 'Falha ao conectar com o servidor.' });
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setAviso(null);
    setSalvando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/logistica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco_lava_rapido: endereco, raio_km: raio, taxa_por_veiculo: taxa, ativo })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso({ tipo: 'erro', texto: json.erro || 'Erro ao salvar.' });
        return;
      }
      preencher(json.config);
      const local = json.config?.local_encontrado;
      setAviso({ tipo: 'ok', texto: local ? `Salvo! Local encontrado no mapa: ${local}` : 'Configuração salva!' });
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha ao conectar com o servidor.' });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>A carregar configuração...</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Leva e Traz</h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
          Informe onde fica o lava-rápido e até quantos km o leva e traz atende. O sistema mede a distância de carro
          até o endereço de cada cliente: dentro do raio, a opção aparece com o valor; fora dele, fica indisponível.
        </p>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', maxWidth: '640px', margin: '0 1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', color: '#0f172a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck color="#3b82f6" /> CONFIGURAÇÃO DO LEVA E TRAZ
        </h3>

        {aviso && (
          <div style={{
            marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid',
            background: aviso.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
            color: aviso.tipo === 'ok' ? '#166534' : '#b91c1c',
            borderColor: aviso.tipo === 'ok' ? '#bbf7d0' : '#fecaca'
          }}>
            {aviso.texto}
          </div>
        )}

        <form onSubmit={salvar}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={rotulo}>ENDEREÇO DO LAVA-RÁPIDO</label>
            <input
              type="text"
              value={endereco}
              maxLength={255}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF, CEP"
              required
              style={campo}
            />
            {salvo?.latitude != null && (
              <a
                href={linkMapa(salvo.latitude, salvo.longitude)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem', fontSize: '0.8rem', color: '#2563eb' }}
              >
                <MapPin size={13} /> Conferir o ponto salvo no mapa <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={rotulo}>RAIO MÁXIMO (KM)</label>
              <input type="number" step="0.1" min="0.1" max="500" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="Ex: 10" required style={campo} />
            </div>
            <div>
              <label style={rotulo}>VALOR POR VEÍCULO (R$)</label>
              <input type="number" step="0.01" min="0" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="Ex: 15,00" required style={campo} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Oferecer o leva e traz aos clientes
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={salvando}
              style={{ padding: '0.75rem 1.5rem', background: salvando ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: salvando ? 'wait' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={16} /> {salvando ? 'Buscando no mapa...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
