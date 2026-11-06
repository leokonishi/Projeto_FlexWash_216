import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck, MapPin, Save, Search, Loader2, CheckCircle2, AlertCircle, Ruler, BadgeDollarSign, Radar, Navigation
} from 'lucide-react';
import { apiFetch, API_URL } from '../utils/api';
import MapaRaio3D from '../componentes/levaTras/MapaRaio3D';
import '../paginas_css/gestao_leva_tras.css';

// Tela do gerente: endereço do lava-rápido (com busca pelo CEP), raio máximo atendido (km)
// e valor por veículo. O mapa 3D mostra o ponto e a área atendida antes de salvar.
// O cliente só vê o leva e traz (com o valor) quando a distância de carro até o endereço
// dele cabe no raio.

const VIACEP_URL = 'https://viacep.com.br/ws';
const RAIO_MAX_SLIDER = 50;
const ENDERECO_VAZIO = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

const soDigitos = (v) => String(v || '').replace(/\D/g, '');
const mascaraCep = (v) => soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
const fmtNumero = (n, casas = 1) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Partes -> texto salvo no banco. Ex.: "Rua X, 123, Sala 2 - Centro, Osasco - SP, 06010-000"
function montarEndereco(e) {
  const linha1 = [e.rua, e.numero, e.complemento].map((s) => s.trim()).filter(Boolean).join(', ');
  return `${linha1} - ${e.bairro.trim()}, ${e.cidade.trim()} - ${e.uf.trim().toUpperCase()}, ${mascaraCep(e.cep)}`;
}

// Texto salvo -> partes (para editar). Devolve null se o texto não estiver nesse formato.
function separarEndereco(texto) {
  const m = String(texto || '').match(/^(.+?), ([^,]+?)(?:, (.+?))? - (.+?), (.+?) - ([A-Za-z]{2}), (\d{5}-?\d{3})$/);
  if (!m) return null;
  return { rua: m[1], numero: m[2], complemento: m[3] || '', bairro: m[4], cidade: m[5], uf: m[6].toUpperCase(), cep: mascaraCep(m[7]) };
}

export default function GestaoLevaTras() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }

  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
  const [enderecoAntigo, setEnderecoAntigo] = useState(''); // salvo num formato que não deu para separar
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState(null);

  const [raio, setRaio] = useState('10');
  const [taxa, setTaxa] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Ponto no mapa: { latitude, longitude, origem: 'salvo' | 'busca' | 'manual', encontrado }
  const [ponto, setPonto] = useState(null);
  const [localizando, setLocalizando] = useState(false);
  const [salvo, setSalvo] = useState(null);

  const preencher = (config) => {
    setSalvo(config);
    if (!config) return;
    const partes = separarEndereco(config.endereco_lava_rapido);
    if (partes) {
      setEndereco(partes);
      setEnderecoAntigo('');
    } else {
      setEndereco(ENDERECO_VAZIO);
      setEnderecoAntigo(config.endereco_lava_rapido || '');
    }
    setRaio(config.raio_km != null ? String(config.raio_km) : '10');
    setTaxa(config.taxa_por_veiculo ?? '');
    setAtivo(Boolean(config.ativo));
    setPonto(config.latitude != null ? { latitude: config.latitude, longitude: config.longitude, origem: 'salvo' } : null);
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

  const mudar = (campo) => (e) => {
    const valor = campo === 'cep' ? mascaraCep(e.target.value) : campo === 'uf' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value;
    setEndereco((atual) => ({ ...atual, [campo]: valor }));
    // Mudou o endereço: o ponto achado antes deixa de valer (o salvo continua até buscar de novo)
    if (campo !== 'complemento' && ponto?.origem === 'busca') setPonto(null);
  };

  // ViaCEP: preenche rua, bairro, cidade e UF
  const buscarCep = async (cepDigitado = endereco.cep) => {
    const cep = soDigitos(cepDigitado);
    setErroCep(null);
    if (cep.length !== 8) {
      setErroCep('O CEP precisa ter 8 dígitos.');
      return;
    }
    setBuscandoCep(true);
    try {
      const res = await fetch(`${VIACEP_URL}/${cep}/json/`);
      const dados = await res.json();
      if (!res.ok || dados.erro) {
        setErroCep('CEP não encontrado. Confira os números ou preencha o endereço à mão.');
        return;
      }
      setEndereco((atual) => ({
        ...atual,
        cep: mascaraCep(cep),
        rua: dados.logradouro || atual.rua,
        bairro: dados.bairro || atual.bairro,
        cidade: dados.localidade || atual.cidade,
        uf: dados.uf || atual.uf
      }));
      setEnderecoAntigo('');
      document.getElementById('lt-numero')?.focus();
    } catch {
      setErroCep('Não foi possível consultar o CEP agora. Preencha o endereço à mão.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const camposObrigatorios = ['cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'];
  const enderecoCompleto = camposObrigatorios.every((c) => endereco[c].trim()) && soDigitos(endereco.cep).length === 8;
  const partesParaApi = () => ({
    cep: soDigitos(endereco.cep), rua: endereco.rua, numero: endereco.numero,
    bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf
  });

  // Acha o endereço no mapa (sem salvar) para conferir o ponto e o raio
  const localizar = async () => {
    setAviso(null);
    if (!enderecoCompleto) {
      setAviso({ tipo: 'erro', texto: 'Preencha CEP, rua, número, bairro, cidade e UF.' });
      return;
    }
    setLocalizando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/logistica/localizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: montarEndereco(endereco), endereco_partes: partesParaApi() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso({ tipo: 'erro', texto: json.erro || 'Não foi possível localizar o endereço.' });
        return;
      }
      setPonto({ latitude: json.latitude, longitude: json.longitude, origem: 'busca', encontrado: json.encontrado });
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha ao conectar com o servidor.' });
    } finally {
      setLocalizando(false);
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setAviso(null);
    if (!enderecoCompleto) {
      setAviso({ tipo: 'erro', texto: 'Preencha CEP, rua, número, bairro, cidade e UF.' });
      return;
    }
    setSalvando(true);
    try {
      const textoEndereco = montarEndereco(endereco);
      // Mesmo endereço já salvo e ponto não mexido: o backend reaproveita as coordenadas
      const pontoConfirmado = ponto && (ponto.origem === 'busca' || ponto.origem === 'manual');
      const res = await apiFetch(`${API_URL}/api/admin/logistica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endereco_lava_rapido: textoEndereco,
          endereco_partes: partesParaApi(),
          ...(pontoConfirmado ? { coordenadas: { latitude: ponto.latitude, longitude: ponto.longitude } } : {}),
          raio_km: raio,
          taxa_por_veiculo: taxa,
          ativo
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso({ tipo: 'erro', texto: json.erro || 'Erro ao salvar.' });
        return;
      }
      preencher(json.config);
      setAviso({ tipo: 'ok', texto: 'Configuração salva! Os clientes já veem o leva e traz com essas regras.' });
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha ao conectar com o servidor.' });
    } finally {
      setSalvando(false);
    }
  };

  const raioNumero = Number(String(raio).replace(',', '.')) || 0;
  const areaKm2 = useMemo(() => Math.PI * raioNumero * raioNumero, [raioNumero]);
  const sliderValor = Math.min(Math.max(raioNumero, 1), RAIO_MAX_SLIDER);

  if (carregando) {
    return (
      <div className="lt-carregando">
        <Loader2 className="lt-girando" size={22} /> A carregar configuração...
      </div>
    );
  }

  return (
    <div className="lt-pagina">
      {/* Cabeçalho */}
      <header className="lt-cabecalho">
        <div className="lt-cabecalho-icone"><Truck size={24} /></div>
        <div className="lt-cabecalho-texto">
          <h2>Leva e Traz</h2>
          <p>Defina de onde o motorista sai e até onde ele vai. Dentro do raio, o cliente vê a opção com o valor; fora dele, a opção fica indisponível.</p>
        </div>
        <span className={`lt-status ${salvo?.ativo ? 'lt-status-ativo' : 'lt-status-inativo'}`}>
          <span className="lt-status-bolinha" /> {salvo?.ativo ? 'Ativo para clientes' : salvo ? 'Desligado' : 'Não configurado'}
        </span>
      </header>

      {aviso && (
        <div className={`lt-aviso ${aviso.tipo === 'ok' ? 'lt-aviso-ok' : 'lt-aviso-erro'}`} role="status">
          {aviso.tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{aviso.texto}</span>
        </div>
      )}

      <form className="lt-grade" onSubmit={salvar}>
        {/* Coluna do formulário */}
        <div className="lt-coluna-form">
          <section className="lt-card">
            <div className="lt-card-titulo">
              <MapPin size={18} /> <h3>Endereço do lava-rápido</h3>
            </div>

            {enderecoAntigo && (
              <p className="lt-dica">
                Endereço salvo: <strong>{enderecoAntigo}</strong>. Busque pelo CEP para atualizar no novo formato.
              </p>
            )}

            <div className="lt-campos">
              <div className="lt-campo lt-campo-cep">
                <label htmlFor="lt-cep">CEP</label>
                <div className="lt-input-botao">
                  <input
                    id="lt-cep"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={endereco.cep}
                    onChange={(e) => {
                      mudar('cep')(e);
                      if (soDigitos(e.target.value).length === 8) buscarCep(e.target.value);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCep(); } }}
                  />
                  <button type="button" onClick={() => buscarCep()} disabled={buscandoCep} title="Buscar CEP">
                    {buscandoCep ? <Loader2 className="lt-girando" size={16} /> : <Search size={16} />}
                  </button>
                </div>
                {erroCep ? (
                  <small className="lt-erro-campo">{erroCep}</small>
                ) : (
                  <small className="lt-ajuda">
                    <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">Não sei o CEP</a>
                  </small>
                )}
              </div>

              <div className="lt-campo lt-campo-largo">
                <label htmlFor="lt-rua">Rua / Avenida</label>
                <input id="lt-rua" value={endereco.rua} onChange={mudar('rua')} placeholder="Preenchido pelo CEP" maxLength={150} />
              </div>

              <div className="lt-campo">
                <label htmlFor="lt-numero">Número</label>
                <input id="lt-numero" value={endereco.numero} onChange={mudar('numero')} placeholder="Ex: 1000" maxLength={10} />
              </div>

              <div className="lt-campo">
                <label htmlFor="lt-complemento">Complemento <em>(opcional)</em></label>
                <input id="lt-complemento" value={endereco.complemento} onChange={mudar('complemento')} placeholder="Ex: Galpão 2" maxLength={60} />
              </div>

              <div className="lt-campo lt-campo-largo">
                <label htmlFor="lt-bairro">Bairro</label>
                <input id="lt-bairro" value={endereco.bairro} onChange={mudar('bairro')} maxLength={100} />
              </div>

              <div className="lt-campo lt-campo-cidade">
                <label htmlFor="lt-cidade">Cidade</label>
                <input id="lt-cidade" value={endereco.cidade} onChange={mudar('cidade')} maxLength={100} />
              </div>

              <div className="lt-campo lt-campo-uf">
                <label htmlFor="lt-uf">UF</label>
                <input id="lt-uf" value={endereco.uf} onChange={mudar('uf')} maxLength={2} placeholder="SP" />
              </div>
            </div>

            <button type="button" className="lt-botao-secundario" onClick={localizar} disabled={localizando || !enderecoCompleto}>
              {localizando ? <Loader2 className="lt-girando" size={16} /> : <Navigation size={16} />}
              {localizando ? 'Procurando no mapa...' : 'Ver no mapa'}
            </button>
          </section>

          <section className="lt-card">
            <div className="lt-card-titulo">
              <Radar size={18} /> <h3>Área e valor</h3>
            </div>

            <div className="lt-campo">
              <label htmlFor="lt-raio">Raio máximo atendido</label>
              <div className="lt-raio">
                <input
                  type="range"
                  min="1"
                  max={RAIO_MAX_SLIDER}
                  step="0.5"
                  value={sliderValor}
                  onChange={(e) => setRaio(e.target.value)}
                  style={{ '--lt-progresso': `${((sliderValor - 1) / (RAIO_MAX_SLIDER - 1)) * 100}%` }}
                  aria-label="Raio em km"
                />
                <div className="lt-input-sufixo">
                  <input id="lt-raio" type="number" step="0.1" min="0.1" max="500" value={raio} onChange={(e) => setRaio(e.target.value)} required />
                  <span>km</span>
                </div>
              </div>
              <small className="lt-ajuda">Distância de carro, só ida, do lava-rápido até o cliente.</small>
            </div>

            <div className="lt-campo">
              <label htmlFor="lt-taxa">Valor por veículo</label>
              <div className="lt-input-prefixo">
                <span>R$</span>
                <input id="lt-taxa" type="number" step="0.01" min="0" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="15,00" required />
              </div>
              <small className="lt-ajuda">Use 0 para oferecer o leva e traz grátis.</small>
            </div>

            <label className="lt-interruptor">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span className="lt-interruptor-trilho"><span className="lt-interruptor-bola" /></span>
              <span>
                <strong>Oferecer o leva e traz aos clientes</strong>
                <small>Desligado, a opção aparece como indisponível no agendamento.</small>
              </span>
            </label>
          </section>

          <button type="submit" className="lt-botao-primario" disabled={salvando}>
            {salvando ? <Loader2 className="lt-girando" size={18} /> : <Save size={18} />}
            {salvando ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>

        {/* Coluna do mapa */}
        <div className="lt-coluna-mapa">
          <section className="lt-card lt-card-mapa">
            <div className="lt-indicadores">
              <div className="lt-indicador">
                <Ruler size={16} />
                <div><span>Raio</span><strong>{fmtNumero(raioNumero)} km</strong></div>
              </div>
              <div className="lt-indicador">
                <Radar size={16} />
                <div><span>Área coberta</span><strong>{fmtNumero(areaKm2, 0)} km²</strong></div>
              </div>
              <div className="lt-indicador">
                <BadgeDollarSign size={16} />
                <div><span>Por veículo</span><strong>{Number(taxa) === 0 && taxa !== '' ? 'Grátis' : fmtMoeda(taxa)}</strong></div>
              </div>
            </div>

            <MapaRaio3D
              latitude={ponto?.latitude}
              longitude={ponto?.longitude}
              raioKm={raioNumero}
              aoMoverPonto={(latitude, longitude) => setPonto({ latitude, longitude, origem: 'manual' })}
            />

            <p className="lt-legenda">
              {ponto?.origem === 'manual'
                ? 'Ponto ajustado à mão. Clique em "Salvar configuração" para usar este local.'
                : ponto?.origem === 'busca'
                  ? `Encontrado: ${ponto.encontrado || 'endereço localizado'}. Se o pino não estiver no lugar certo, arraste-o.`
                  : ponto?.origem === 'salvo'
                    ? 'Local salvo. Arraste o pino para ajustar a posição.'
                    : 'Gire e incline o mapa com o botão direito do mouse (ou dois dedos no celular).'}
            </p>
          </section>
        </div>
      </form>
    </div>
  );
}
