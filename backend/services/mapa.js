// Mapa do leva e traz: transforma endereço em coordenadas e mede a distância de carro.
//
// Serviços usados (gratuitos e sem chave):
//  - Geocodificação: Nominatim (OpenStreetMap). Regras de uso: no máximo 1 pedido por
//    segundo e um User-Agent que identifique o sistema. Por isso há fila e cache aqui.
//  - CEP: ViaCEP, usado quando o endereço tem CEP e o Nominatim não achou o texto livre.
//  - Rota: OSRM (servidor público do projeto OSRM). Se ele estiver fora do ar, a distância
//    é estimada pela linha reta x FATOR_ESTIMATIVA_ROTA, e o resultado avisa (metodo = 'estimativa').
//
// Variáveis de ambiente opcionais (para trocar por um servidor próprio ou pago no futuro):
//  MAPA_NOMINATIM_URL, MAPA_OSRM_URL, MAPA_VIACEP_URL, MAPA_USER_AGENT
const { ErroNegocio } = require('./erros');

const NOMINATIM_URL = (process.env.MAPA_NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const OSRM_URL = (process.env.MAPA_OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const VIACEP_URL = (process.env.MAPA_VIACEP_URL || 'https://viacep.com.br').replace(/\/$/, '');
const USER_AGENT = process.env.MAPA_USER_AGENT || 'FlexWash/1.0 (sistema de lava-rapido)';

const TEMPO_LIMITE_MS = 8000;
const INTERVALO_NOMINATIM_MS = 1100; // pouco mais de 1 por segundo
const FATOR_ESTIMATIVA_ROTA = 1.3;   // linha reta -> rota aproximada, quando o OSRM falha
const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_ITENS_CACHE = 2000;

// ---------------------------------------------------------------------
// Cache simples em memória (endereço -> coordenadas, par de pontos -> km)
// ---------------------------------------------------------------------
function criarCache() {
  const itens = new Map();
  return {
    ler(chave) {
      const item = itens.get(chave);
      if (!item) return undefined;
      if (Date.now() - item.em > VALIDADE_CACHE_MS) {
        itens.delete(chave);
        return undefined;
      }
      return item.valor;
    },
    gravar(chave, valor) {
      if (itens.size >= MAX_ITENS_CACHE) itens.delete(itens.keys().next().value);
      itens.set(chave, { valor, em: Date.now() });
    },
    limpar() {
      itens.clear();
    }
  };
}
const cacheEnderecos = criarCache();
const cacheRotas = criarCache();

// ---------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------
async function buscarJson(url) {
  const resposta = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${new URL(url).host}`);
  return resposta.json();
}

// Fila do Nominatim: um pedido de cada vez, com intervalo mínimo entre eles
let filaNominatim = Promise.resolve();
let ultimoPedidoNominatim = 0;
function pedirAoNominatim(url) {
  const tarefa = filaNominatim.then(async () => {
    const espera = ultimoPedidoNominatim + INTERVALO_NOMINATIM_MS - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimoPedidoNominatim = Date.now();
    return buscarJson(url);
  });
  filaNominatim = tarefa.catch(() => {});
  return tarefa;
}

// ---------------------------------------------------------------------
// Geocodificação
// ---------------------------------------------------------------------

// "Rua X, 123 - Centro, Osasco - SP, 06010-000" -> texto que o Nominatim entende melhor
function limparEndereco(texto) {
  return String(texto ?? '')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\bCEP\b:?/gi, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(,\s*)+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function extrairCep(texto) {
  const achado = String(texto ?? '').match(/\b(\d{5})-?(\d{3})\b/);
  return achado ? `${achado[1]}${achado[2]}` : null;
}

// Primeiro número que parece ser o número da casa (logo depois de uma vírgula ou "nº")
function extrairNumero(texto) {
  const achado = String(texto ?? '').match(/(?:,|n[º°o.]?)\s*(\d{1,6}[A-Za-z]?)\b(?!-?\d{3}\b)/i);
  return achado ? achado[1] : null;
}

function paraCoordenadas(lista) {
  const primeiro = Array.isArray(lista) ? lista[0] : null;
  if (!primeiro) return null;
  const latitude = Number(primeiro.lat);
  const longitude = Number(primeiro.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, encontrado: primeiro.display_name || null };
}

async function buscaLivre(texto) {
  const parametros = new URLSearchParams({ q: texto, format: 'jsonv2', limit: '1', countrycodes: 'br' });
  return paraCoordenadas(await pedirAoNominatim(`${NOMINATIM_URL}/search?${parametros}`));
}

async function buscaPorCep(cep, numero) {
  const dados = await buscarJson(`${VIACEP_URL}/ws/${cep}/json/`);
  if (!dados || dados.erro) return null;

  const rua = [numero, dados.logradouro].filter(Boolean).join(' ');
  const parametros = new URLSearchParams({
    city: dados.localidade || '',
    state: dados.uf || '',
    country: 'Brasil',
    format: 'jsonv2',
    limit: '1'
  });
  if (rua) parametros.set('street', rua);

  const achado = paraCoordenadas(await pedirAoNominatim(`${NOMINATIM_URL}/search?${parametros}`));
  if (achado || !rua) return achado;

  // Sem a rua no mapa: tenta pelo bairro + cidade do CEP (menos preciso, mas ainda útil)
  const alternativa = [dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(', ');
  return alternativa ? buscaLivre(alternativa) : null;
}

// Endereço em texto -> { latitude, longitude, encontrado }.
// Lança ErroNegocio 422 se o endereço não existir no mapa e 503 se o serviço falhar.
async function geocodificar(endereco) {
  const texto = limparEndereco(endereco);
  if (!texto) throw new ErroNegocio('Informe o endereço.', 400);

  const chave = texto.toLowerCase();
  const guardado = cacheEnderecos.ler(chave);
  if (guardado) return guardado;

  let resultado;
  try {
    resultado = await buscaLivre(texto);
    const cep = extrairCep(texto);
    if (!resultado && cep) resultado = await buscaPorCep(cep, extrairNumero(texto));
  } catch (erro) {
    console.error('[mapa] Falha na geocodificação:', erro.message);
    throw new ErroNegocio('Não foi possível consultar o mapa agora. Tente de novo em instantes.', 503);
  }

  if (!resultado) {
    throw new ErroNegocio(
      'Não encontramos esse endereço no mapa. Confira rua, número, bairro e cidade (o CEP ajuda).',
      422
    );
  }

  cacheEnderecos.gravar(chave, resultado);
  return resultado;
}

// ---------------------------------------------------------------------
// Distância
// ---------------------------------------------------------------------

// Linha reta entre dois pontos (fórmula de haversine), em km
function distanciaRetaKm(a, b) {
  const raioTerra = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * raioTerra * Math.asin(Math.sqrt(h));
}

const arredondarKm = (km) => Math.round(km * 100) / 100;

// Distância de carro de `origem` até `destino` ({ latitude, longitude }).
// Retorna { km, metodo: 'rota' | 'estimativa' }.
async function distanciaKm(origem, destino) {
  const ponto = (p) => `${Number(p.longitude).toFixed(6)},${Number(p.latitude).toFixed(6)}`;
  const chave = `${ponto(origem)};${ponto(destino)}`;
  const guardado = cacheRotas.ler(chave);
  if (guardado) return guardado;

  try {
    const dados = await buscarJson(`${OSRM_URL}/route/v1/driving/${chave}?overview=false&alternatives=false`);
    const metros = Number(dados?.routes?.[0]?.distance);
    if (dados?.code !== 'Ok' || !Number.isFinite(metros)) throw new Error(`OSRM respondeu ${dados?.code}`);
    const resultado = { km: arredondarKm(metros / 1000), metodo: 'rota' };
    cacheRotas.gravar(chave, resultado);
    return resultado;
  } catch (erro) {
    // Não guarda no cache: na próxima consulta tenta a rota de novo
    console.error('[mapa] Falha ao calcular a rota, usando estimativa:', erro.message);
    return { km: arredondarKm(distanciaRetaKm(origem, destino) * FATOR_ESTIMATIVA_ROTA), metodo: 'estimativa' };
  }
}

module.exports = {
  geocodificar,
  distanciaKm,
  distanciaRetaKm,
  limparEndereco,
  extrairCep,
  extrairNumero,
  FATOR_ESTIMATIVA_ROTA,
  _limparCaches: () => {
    cacheEnderecos.limpar();
    cacheRotas.limpar();
  }
};
