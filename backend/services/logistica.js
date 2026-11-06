// Leva e traz por raio.
// O gerente cadastra o endereço do lava-rápido, o raio máximo (km) e a taxa por veículo
// (tabela config_logistica). Para o cliente, o backend mede a distância de carro entre o
// lava-rápido e o endereço dele: dentro do raio, o leva e traz fica disponível com o valor;
// fora do raio (ou sem endereço), fica indisponível e a tela explica o motivo.
const { ErroNegocio } = require('./erros');
const { centavosParaDecimal } = require('./precoExecucao');
const mapa = require('./mapa');

const RAIO_MAXIMO_PERMITIDO_KM = 500;
const TAXA_MAXIMA = 10000;

const COLUNAS = `id, descricao, taxa_por_veiculo, valor_por_km, taxa_minima, distancia_maxima_km,
                 endereco_lava_rapido, latitude, longitude, ativo, criado_em`;

function formatarConfig(linha) {
  if (!linha) return null;
  const temCoordenadas = linha.latitude !== null && linha.longitude !== null;
  return {
    id: linha.id,
    ativo: Boolean(linha.ativo),
    endereco_lava_rapido: linha.endereco_lava_rapido || '',
    latitude: temCoordenadas ? Number(linha.latitude) : null,
    longitude: temCoordenadas ? Number(linha.longitude) : null,
    raio_km: linha.distancia_maxima_km === null ? null : Number(linha.distancia_maxima_km),
    taxa_por_veiculo: Number(linha.taxa_por_veiculo || 0).toFixed(2),
    atualizado_em: linha.criado_em
  };
}

// Configuração em vigor (ou null se o leva e traz estiver desligado)
async function configAtiva(conn) {
  const [linhas] = await conn.execute(
    `SELECT ${COLUNAS} FROM config_logistica WHERE ativo = TRUE ORDER BY id DESC LIMIT 1`
  );
  return formatarConfig(linhas[0]);
}

// Última configuração salva, ativa ou não (para preencher a tela do gerente)
async function ultimaConfig(conn) {
  const [linhas] = await conn.execute(`SELECT ${COLUNAS} FROM config_logistica ORDER BY ativo DESC, id DESC LIMIT 1`);
  return formatarConfig(linhas[0]);
}

function lerNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor.replace(',', '.'));
  return NaN;
}

function validarConfig(corpo) {
  const endereco = typeof corpo?.endereco_lava_rapido === 'string' ? corpo.endereco_lava_rapido.trim() : '';
  const raio = lerNumero(corpo?.raio_km);
  const taxa = lerNumero(corpo?.taxa_por_veiculo);
  const ativo = corpo?.ativo !== false;

  if (!endereco) throw new ErroNegocio('Informe o endereço do lava-rápido.');
  if (endereco.length > 255) throw new ErroNegocio('O endereço pode ter no máximo 255 caracteres.');
  if (!Number.isFinite(raio) || raio <= 0 || raio > RAIO_MAXIMO_PERMITIDO_KM) {
    throw new ErroNegocio(`Informe um raio entre 0,1 e ${RAIO_MAXIMO_PERMITIDO_KM} km.`);
  }
  if (!Number.isFinite(taxa) || taxa < 0 || taxa > TAXA_MAXIMA) {
    throw new ErroNegocio('Informe um valor válido para o leva e traz (pode ser 0 para grátis).');
  }

  return {
    endereco,
    raio: Math.round(raio * 100) / 100,
    taxaCentavos: Math.round(taxa * 100),
    ativo
  };
}

// Salva uma nova configuração (tela do gerente).
// Segue a regra da tabela: a linha anterior é desativada e uma nova é criada,
// guardando o histórico. As coordenadas do lava-rápido são buscadas no mapa aqui.
async function salvarConfig(db, corpo) {
  const { endereco, raio, taxaCentavos, ativo } = validarConfig(corpo);

  const anterior = await ultimaConfig(db);
  let coordenadas;
  if (anterior && anterior.latitude !== null && anterior.endereco_lava_rapido === endereco) {
    coordenadas = { latitude: anterior.latitude, longitude: anterior.longitude, encontrado: null };
  } else {
    coordenadas = await mapa.geocodificar(endereco);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Mantém os campos de preço por km que já existiam (não usados nesta regra)
    const [[atual]] = await conn.execute(
      'SELECT valor_por_km, taxa_minima FROM config_logistica ORDER BY ativo DESC, id DESC LIMIT 1'
    );
    await conn.execute('UPDATE config_logistica SET ativo = FALSE WHERE ativo = TRUE');
    await conn.execute(
      `INSERT INTO config_logistica
         (descricao, taxa_por_veiculo, valor_por_km, taxa_minima, distancia_maxima_km,
          endereco_lava_rapido, latitude, longitude, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Leva e traz por raio',
        centavosParaDecimal(taxaCentavos),
        atual ? atual.valor_por_km : 0,
        atual ? atual.taxa_minima : 0,
        raio,
        endereco,
        coordenadas.latitude.toFixed(8),
        coordenadas.longitude.toFixed(8),
        ativo
      ]
    );
    await conn.commit();
  } catch (erro) {
    await conn.rollback().catch(() => {});
    throw erro;
  } finally {
    conn.release();
  }

  return { ...(await ultimaConfig(db)), local_encontrado: coordenadas.encontrado };
}

// Resposta "indisponível" com o motivo para a tela do cliente
function indisponivel(motivo, mensagem, extra = {}) {
  return { disponivel: false, motivo, mensagem, taxa_por_veiculo: null, ...extra };
}

// O leva e traz atende o cliente? Mede a distância de carro do lava-rápido até o
// endereço dele e compara com o raio. Nunca lança erro de mapa: devolve o motivo.
async function avaliarLevaTras(db, clienteId) {
  const config = await configAtiva(db);
  if (!config || config.latitude === null) {
    return indisponivel('desativado', 'O leva e traz não está disponível no momento.');
  }

  const base = {
    endereco_lava_rapido: config.endereco_lava_rapido,
    raio_km: config.raio_km
  };

  const [[cliente]] = await db.execute('SELECT endereco FROM clientes WHERE id = ?', [clienteId]);
  const enderecoCliente = (cliente?.endereco || '').trim();
  if (!enderecoCliente) {
    return indisponivel('sem_endereco', 'Cadastre o endereço de busca para ver se o leva e traz atende você.', {
      ...base,
      endereco_cliente: ''
    });
  }
  base.endereco_cliente = enderecoCliente;

  let destino;
  try {
    destino = await mapa.geocodificar(enderecoCliente);
  } catch (erro) {
    if (!(erro instanceof ErroNegocio)) throw erro;
    const motivo = erro.status === 422 ? 'endereco_nao_encontrado' : 'mapa_indisponivel';
    return indisponivel(motivo, erro.message, base);
  }

  const { km, metodo } = await mapa.distanciaKm(config, destino);
  const extra = { ...base, distancia_km: km, metodo_distancia: metodo };

  if (config.raio_km !== null && km > config.raio_km) {
    const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return indisponivel(
      'fora_do_raio',
      `Seu endereço fica a ${fmt(km)} km do lava-rápido. O leva e traz atende até ${fmt(config.raio_km)} km.`,
      extra
    );
  }

  return {
    disponivel: true,
    motivo: null,
    mensagem: null,
    taxa_por_veiculo: config.taxa_por_veiculo,
    ...extra
  };
}

module.exports = {
  configAtiva,
  ultimaConfig,
  salvarConfig,
  validarConfig,
  avaliarLevaTras
};
