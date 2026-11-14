// Fidelidade, cupons e promoção por movimento fraco (sprint 4).
//
// Regras combinadas com o dono do lava-rápido:
// - "Visita" = um agendamento (vários carros contam 1) ou uma ida ao pátio sem agendamento
//   no mesmo dia. Só conta depois que algum carro dela é Finalizado.
// - A cada N visitas (config) o cliente ganha um cupom pessoal de fidelidade.
// - O benefício (fidelidade e movimento fraco) é escolhido no painel: % de desconto nos
//   serviços ou um extra grátis.
// - Agendamento cancelado: o uso do cupom é estornado e o cupom volta para o cliente.
// - Serviço apagado pelo admin: a contagem de visitas diminui (é sempre recalculada).
const crypto = require('crypto');
const { ErroNegocio } = require('./erros');
const { precoEmCentavos, centavosParaDecimal } = require('./precoExecucao');
const agenda = require('./agenda');

const TIPOS_BENEFICIO = ['percentual', 'extra_gratis'];

// Uma visita: o agendamento, ou o dia (de Brasília) da entrada no pátio sem agendamento
const SQL_CHAVE_VISITA = "COALESCE(CONCAT('A', agendamento_id), CONCAT('P', DATE(criado_em - INTERVAL 3 HOUR)))";

// ---------------------------------------------------------------------
// Configuração (uma linha em config_promocoes)
// ---------------------------------------------------------------------

function formatarConfig(linha) {
  return {
    fidelidade_ativa: Boolean(linha.fidelidade_ativa),
    fidelidade_meta_visitas: Number(linha.fidelidade_meta_visitas),
    fidelidade_tipo: linha.fidelidade_tipo,
    fidelidade_percentual: Number(linha.fidelidade_percentual),
    fidelidade_extra_id: linha.fidelidade_extra_id === null ? null : Number(linha.fidelidade_extra_id),
    movimento_ativo: Boolean(linha.movimento_ativo),
    movimento_meta_carros: Number(linha.movimento_meta_carros),
    movimento_hora_verificacao: linha.movimento_hora_verificacao,
    movimento_tipo: linha.movimento_tipo,
    movimento_percentual: Number(linha.movimento_percentual),
    movimento_extra_id: linha.movimento_extra_id === null ? null : Number(linha.movimento_extra_id)
  };
}

async function obterConfig(db) {
  const [[linha]] = await db.execute('SELECT * FROM config_promocoes WHERE id = 1');
  if (!linha) {
    // Tabela criada mas sem a linha padrão: cria agora
    await db.execute('INSERT IGNORE INTO config_promocoes (id) VALUES (1)');
    const [[nova]] = await db.execute('SELECT * FROM config_promocoes WHERE id = 1');
    return formatarConfig(nova);
  }
  return formatarConfig(linha);
}

function lerBeneficio(corpo, prefixo, rotulo) {
  const tipo = corpo[`${prefixo}_tipo`];
  if (!TIPOS_BENEFICIO.includes(tipo)) throw new ErroNegocio(`${rotulo}: escolha o tipo de benefício.`);
  const percentual = Number(corpo[`${prefixo}_percentual`] ?? 0);
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    throw new ErroNegocio(`${rotulo}: o desconto deve ficar entre 0 e 100%.`);
  }
  if (tipo === 'percentual' && percentual <= 0) throw new ErroNegocio(`${rotulo}: informe o % de desconto.`);
  const extraBruto = corpo[`${prefixo}_extra_id`];
  const extraId = extraBruto === null || extraBruto === undefined || extraBruto === '' ? null : Number(extraBruto);
  if (extraId !== null && (!Number.isInteger(extraId) || extraId <= 0)) throw new ErroNegocio(`${rotulo}: extra inválido.`);
  if (tipo === 'extra_gratis' && extraId === null) throw new ErroNegocio(`${rotulo}: escolha qual extra sai grátis.`);
  return { tipo, percentual, extraId };
}

async function salvarConfig(db, corpo = {}) {
  const meta = Number(corpo.fidelidade_meta_visitas);
  if (!Number.isInteger(meta) || meta < 1 || meta > 100) throw new ErroNegocio('Fidelidade: a meta deve ser de 1 a 100 visitas.');
  const metaCarros = Number(corpo.movimento_meta_carros);
  if (!Number.isInteger(metaCarros) || metaCarros < 0 || metaCarros > 500) {
    throw new ErroNegocio('Movimento: informe a meta de carros por dia (número inteiro).');
  }
  const hora = String(corpo.movimento_hora_verificacao || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new ErroNegocio('Movimento: horário de verificação inválido (use HH:MM).');

  const fid = lerBeneficio(corpo, 'fidelidade', 'Fidelidade');
  const mov = lerBeneficio(corpo, 'movimento', 'Movimento fraco');

  for (const extraId of [fid.extraId, mov.extraId].filter((id) => id !== null)) {
    const [[existe]] = await db.execute('SELECT id FROM servicos_extras WHERE id = ?', [extraId]);
    if (!existe) throw new ErroNegocio('O extra escolhido não existe mais. Atualize a tela.', 404);
  }

  await db.execute('INSERT IGNORE INTO config_promocoes (id) VALUES (1)');
  await db.execute(
    `UPDATE config_promocoes SET
       fidelidade_ativa = ?, fidelidade_meta_visitas = ?, fidelidade_tipo = ?, fidelidade_percentual = ?, fidelidade_extra_id = ?,
       movimento_ativo = ?, movimento_meta_carros = ?, movimento_hora_verificacao = ?, movimento_tipo = ?,
       movimento_percentual = ?, movimento_extra_id = ?
     WHERE id = 1`,
    [
      Boolean(corpo.fidelidade_ativa), meta, fid.tipo, fid.percentual, fid.tipo === 'extra_gratis' ? fid.extraId : null,
      Boolean(corpo.movimento_ativo), metaCarros, hora, mov.tipo,
      mov.percentual, mov.tipo === 'extra_gratis' ? mov.extraId : null
    ]
  );
  return obterConfig(db);
}

// ---------------------------------------------------------------------
// Cupons: código, descrição e cálculo do desconto
// ---------------------------------------------------------------------

function gerarCodigo(prefixo) {
  // Sem 0/O e 1/I para não confundir na hora de digitar
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let sufixo = '';
  for (const b of bytes) sufixo += alfabeto[b % alfabeto.length];
  return `${prefixo}-${sufixo}`;
}

async function inserirCupom(conn, dados) {
  // Tenta de novo no caso (raríssimo) de código repetido
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo(dados.prefixo);
    try {
      const [res] = await conn.execute(
        `INSERT INTO cupons (codigo, origem, cliente_id, tipo, percentual, extra_id, valido_para_data, limite_usos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo, dados.origem, dados.clienteId ?? null, dados.tipo,
          dados.tipo === 'percentual' ? dados.percentual : null,
          dados.tipo === 'extra_gratis' ? dados.extraId : null,
          dados.validoParaData ?? null, dados.limiteUsos ?? null
        ]
      );
      return { id: res.insertId, codigo };
    } catch (erro) {
      if (erro.code === 'ER_DUP_ENTRY' && /codigo/.test(erro.message)) continue;
      throw erro;
    }
  }
  throw new Error('Não foi possível gerar um código de cupom único.');
}

// Texto do benefício para mostrar na tela
function descreverBeneficio(cupom) {
  if (cupom.tipo === 'percentual') return `${Number(cupom.percentual)}% de desconto nos serviços`;
  return cupom.extra_nome ? `${cupom.extra_nome} grátis` : 'Extra grátis';
}

function formatarCupom(c) {
  return {
    id: c.id,
    codigo: c.codigo,
    origem: c.origem,
    tipo: c.tipo,
    percentual: c.percentual === null ? null : Number(c.percentual),
    extra_id: c.extra_id,
    extra_nome: c.extra_nome || null,
    valido_para_data: c.valido_para_data_txt || null,
    descricao: descreverBeneficio(c)
  };
}

const SQL_CUPOM = `
  SELECT c.*, DATE_FORMAT(c.valido_para_data, '%Y-%m-%d') AS valido_para_data_txt, ex.nome AS extra_nome
    FROM cupons c
    LEFT JOIN servicos_extras ex ON ex.id = c.extra_id`;

// ---------------------------------------------------------------------
// Fidelidade
// ---------------------------------------------------------------------

async function contarVisitas(conn, clienteId) {
  const [[linha]] = await conn.execute(
    `SELECT COUNT(DISTINCT ${SQL_CHAVE_VISITA}) AS visitas FROM execucoes WHERE cliente_id = ? AND status = 'Finalizado'`,
    [clienteId]
  );
  return Number(linha.visitas);
}

// Deixa os cupons de fidelidade do cliente de acordo com as visitas:
// - ganhou mais do que tem: emite os que faltam (com o benefício configurado agora);
// - tem mais do que ganhou (o admin apagou serviços): desativa os que ainda não foram usados.
async function sincronizarCuponsFidelidade(conn, clienteId, config) {
  const visitas = await contarVisitas(conn, clienteId);
  const meta = config.fidelidade_meta_visitas;
  const ganhos = Math.floor(visitas / meta);

  const [cupons] = await conn.execute(
    `SELECT c.id, c.ativo,
            EXISTS (SELECT 1 FROM cupom_usos u WHERE u.cupom_id = c.id AND u.status = 'ativo') AS usado
       FROM cupons c
      WHERE c.cliente_id = ? AND c.origem = 'fidelidade'
      ORDER BY c.id`,
    [clienteId]
  );
  const validos = cupons.filter((c) => c.ativo || Number(c.usado));

  if (config.fidelidade_ativa && validos.length < ganhos) {
    for (let i = validos.length; i < ganhos; i++) {
      await inserirCupom(conn, {
        prefixo: 'FIEL',
        origem: 'fidelidade',
        clienteId,
        tipo: config.fidelidade_tipo,
        percentual: config.fidelidade_percentual,
        extraId: config.fidelidade_extra_id,
        limiteUsos: 1
      });
    }
  } else if (validos.length > ganhos) {
    let sobrando = validos.length - ganhos;
    const naoUsados = validos.filter((c) => c.ativo && !Number(c.usado)).reverse();
    for (const c of naoUsados) {
      if (sobrando === 0) break;
      await conn.execute('UPDATE cupons SET ativo = FALSE WHERE id = ?', [c.id]);
      sobrando--;
    }
  }
  return { visitas, meta, ganhos };
}

// Resumo para o painel do cliente (GET /api/me/fidelidade)
async function resumoFidelidade(db, clienteId) {
  const config = await obterConfig(db);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Trava o cliente para dois acessos ao mesmo tempo não emitirem cupom em dobro
    await conn.execute('SELECT id FROM clientes WHERE id = ? FOR UPDATE', [clienteId]);
    const { visitas, meta } = await sincronizarCuponsFidelidade(conn, clienteId, config);
    await conn.commit();

    const [disponiveis] = await db.execute(
      `${SQL_CUPOM}
        WHERE c.cliente_id = ? AND c.origem = 'fidelidade' AND c.ativo = TRUE
          AND NOT EXISTS (SELECT 1 FROM cupom_usos u WHERE u.cupom_id = c.id AND u.status = 'ativo')
        ORDER BY c.id`,
      [clienteId]
    );
    const noCiclo = visitas % meta;
    let beneficio = null;
    if (config.fidelidade_ativa) {
      const [[extra]] = config.fidelidade_extra_id
        ? await db.execute('SELECT nome FROM servicos_extras WHERE id = ?', [config.fidelidade_extra_id])
        : [[null]];
      beneficio = descreverBeneficio({
        tipo: config.fidelidade_tipo,
        percentual: config.fidelidade_percentual,
        extra_nome: extra?.nome
      });
    }
    return {
      ativo: config.fidelidade_ativa,
      visitas_concluidas: visitas,
      meta,
      visitas_no_ciclo: noCiclo,
      faltam: config.fidelidade_ativa ? meta - noCiclo : null,
      beneficio,
      cupons_disponiveis: disponiveis.map(formatarCupom)
    };
  } catch (erro) {
    await conn.rollback().catch(() => {});
    throw erro;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------
// Movimento do dia e promoção relâmpago
// ---------------------------------------------------------------------

// Carros do dia (sem cancelados): os agendados para o dia + entradas no pátio feitas no dia
async function carrosDoDia(conn, data) {
  const [[linha]] = await conn.execute(
    `SELECT COUNT(*) AS total FROM execucoes
      WHERE status <> 'Cancelado'
        AND ((data_agendamento >= ? AND data_agendamento < ?)
          OR (data_agendamento IS NULL AND DATE(criado_em - INTERVAL 3 HOUR) = ?))`,
    [`${data} 00:00:00`, `${agenda.somarDias(data, 1)} 00:00:00`, data]
  );
  return Number(linha.total);
}

async function promocaoDoDia(conn, data) {
  const [[cupom]] = await conn.execute(
    `${SQL_CUPOM} WHERE c.origem = 'movimento_fraco' AND c.valido_para_data = ?`,
    [data]
  );
  return cupom || null;
}

async function movimentoDiario(db, data) {
  const dia = data || agenda.agoraLocal().data;
  if (!agenda.dataValida(dia)) throw new ErroNegocio('Data inválida. Use o formato AAAA-MM-DD.');
  const config = await obterConfig(db);
  const carros = await carrosDoDia(db, dia);
  const promocao = await promocaoDoDia(db, dia);
  return {
    data: dia,
    carros,
    meta: config.movimento_meta_carros,
    abaixo_da_meta: carros < config.movimento_meta_carros,
    automatico: config.movimento_ativo,
    hora_verificacao: config.movimento_hora_verificacao,
    promocao: promocao ? { ...formatarCupom(promocao), ativo: Boolean(promocao.ativo) } : null
  };
}

// Gera o cupom relâmpago do dia. `forcar` (botão do admin) ignora a meta.
async function gerarPromocaoMovimento(db, { data, forcar = false } = {}) {
  const dia = data || agenda.agoraLocal().data;
  if (!agenda.dataValida(dia)) throw new ErroNegocio('Data inválida. Use o formato AAAA-MM-DD.');
  if (dia < agenda.agoraLocal().data) throw new ErroNegocio('Não dá para criar promoção para um dia que já passou.');

  const config = await obterConfig(db);
  if (config.movimento_tipo === 'extra_gratis' && !config.movimento_extra_id) {
    throw new ErroNegocio('Escolha na configuração qual extra sai grátis na promoção.');
  }
  const existente = await promocaoDoDia(db, dia);
  if (existente) throw new ErroNegocio('Já existe uma promoção relâmpago para esse dia.', 409);

  const carros = await carrosDoDia(db, dia);
  if (!forcar && carros >= config.movimento_meta_carros) {
    throw new ErroNegocio(`O dia já tem ${carros} carro(s), dentro da meta de ${config.movimento_meta_carros}.`, 409);
  }

  try {
    const { id } = await inserirCupom(db, {
      prefixo: 'RELAMPAGO',
      origem: 'movimento_fraco',
      tipo: config.movimento_tipo,
      percentual: config.movimento_percentual,
      extraId: config.movimento_extra_id,
      validoParaData: dia
    });
    const [[cupom]] = await db.execute(`${SQL_CUPOM} WHERE c.id = ?`, [id]);
    return formatarCupom(cupom);
  } catch (erro) {
    // Outro pedido criou a promoção do dia ao mesmo tempo
    if (erro.code === 'ER_DUP_ENTRY') throw new ErroNegocio('Já existe uma promoção relâmpago para esse dia.', 409);
    throw erro;
  }
}

// Gatilho automático: depois da hora de verificação, se o dia estiver abaixo da meta
// e ainda não houver promoção, cria uma. Roda quando alguém abre o painel (cliente ou
// admin), então não depende de um servidor com rotina agendada.
async function garantirPromocaoAutomatica(db) {
  const config = await obterConfig(db);
  if (!config.movimento_ativo) return null;
  if (config.movimento_tipo === 'extra_gratis' && !config.movimento_extra_id) return null;
  const agora = agenda.agoraLocal();
  if (agora.hora < config.movimento_hora_verificacao) return null;
  if (await promocaoDoDia(db, agora.data)) return null;
  if ((await carrosDoDia(db, agora.data)) >= config.movimento_meta_carros) return null;
  try {
    return await gerarPromocaoMovimento(db, { data: agora.data });
  } catch (erro) {
    if (erro instanceof ErroNegocio) return null; // outro acesso já criou
    throw erro;
  }
}

// Promoção relâmpago de hoje que o cliente ainda pode usar (banner do painel)
async function promocaoParaCliente(db, clienteId) {
  await garantirPromocaoAutomatica(db);
  const hoje = agenda.agoraLocal().data;
  const [[cupom]] = await db.execute(
    `${SQL_CUPOM}
      WHERE c.origem = 'movimento_fraco' AND c.ativo = TRUE AND c.valido_para_data = ?
        AND NOT EXISTS (SELECT 1 FROM cupom_usos u WHERE u.cupom_id = c.id AND u.cliente_id = ? AND u.status = 'ativo')`,
    [hoje, clienteId]
  );
  return cupom ? formatarCupom(cupom) : null;
}

// ---------------------------------------------------------------------
// Uso do cupom no agendamento
// ---------------------------------------------------------------------

// Confere se o cupom pode ser usado por este cliente nas datas do agendamento.
// Com `conn` em transação, trava o cupom (FOR UPDATE) até o fim do agendamento.
async function validarCupom(conn, { codigo, clienteId, datas = [], travar = false }) {
  const texto = String(codigo || '').trim().toUpperCase();
  if (!texto) throw new ErroNegocio('Digite o código do cupom.');

  const [[cupom]] = await conn.execute(`${SQL_CUPOM} WHERE c.codigo = ?${travar ? ' FOR UPDATE' : ''}`, [texto]);
  if (!cupom || !cupom.ativo) throw new ErroNegocio('Cupom inválido ou desativado.', 404);
  if (cupom.cliente_id !== null && Number(cupom.cliente_id) !== Number(clienteId)) {
    throw new ErroNegocio('Este cupom é de outro cliente.', 403);
  }

  if (cupom.valido_para_data_txt) {
    const hoje = agenda.agoraLocal().data;
    if (cupom.valido_para_data_txt < hoje) throw new ErroNegocio('Este cupom já expirou.', 410);
    const [ano, mes, dia] = cupom.valido_para_data_txt.split('-');
    if (datas.some((d) => d !== cupom.valido_para_data_txt)) {
      throw new ErroNegocio(`Este cupom vale só para lavagens marcadas em ${dia}/${mes}/${ano}.`, 409);
    }
  }

  if (cupom.tipo === 'extra_gratis' && !cupom.extra_id) {
    throw new ErroNegocio('O extra deste cupom não está mais disponível.', 409);
  }

  const [[usoProprio]] = await conn.execute(
    "SELECT id FROM cupom_usos WHERE cupom_id = ? AND cliente_id = ? AND status = 'ativo'",
    [cupom.id, clienteId]
  );
  if (usoProprio) throw new ErroNegocio('Você já usou este cupom.', 409);

  if (cupom.limite_usos !== null) {
    const [[usos]] = await conn.execute("SELECT COUNT(*) AS total FROM cupom_usos WHERE cupom_id = ? AND status = 'ativo'", [cupom.id]);
    if (Number(usos.total) >= Number(cupom.limite_usos)) throw new ErroNegocio('Este cupom já atingiu o limite de usos.', 409);
  }

  return cupom;
}

// Calcula o desconto de cada carro. `itens`: [{ porte, lavagemCentavos, extraIds }].
// Percentual: sobre a lavagem (pacote + extras), sem a taxa do leva e traz.
// Extra grátis: no primeiro carro; se ele ainda não tinha o extra, o extra é incluído.
// Devolve { descontos: [centavos por item], extraIncluido: { indice, extra } | null }.
async function calcularDescontos(conn, cupom, itens) {
  if (cupom.tipo === 'percentual') {
    const pct = Number(cupom.percentual);
    return { descontos: itens.map((i) => Math.round((i.lavagemCentavos * pct) / 100)), extraIncluido: null };
  }

  const [[extra]] = await conn.execute(
    'SELECT id, nome, preco_pequeno, preco_medio, preco_grande FROM servicos_extras WHERE id = ?',
    [cupom.extra_id]
  );
  if (!extra) throw new ErroNegocio('O extra deste cupom não está mais disponível.', 409);
  const descontos = itens.map(() => 0);
  descontos[0] = precoEmCentavos(extra, itens[0].porte);
  const jaTinha = itens[0].extraIds.includes(Number(extra.id));
  return { descontos, extraIncluido: jaTinha ? null : { indice: 0, extra } };
}

async function registrarUso(conn, { cupomId, clienteId, agendamentoId, descontoCentavos }) {
  try {
    await conn.execute(
      'INSERT INTO cupom_usos (cupom_id, cliente_id, agendamento_id, valor_desconto) VALUES (?, ?, ?, ?)',
      [cupomId, clienteId, agendamentoId, centavosParaDecimal(descontoCentavos)]
    );
  } catch (erro) {
    // Índice único (cupom, cliente, uso ativo): dois pedidos ao mesmo tempo com o mesmo cupom
    if (erro.code === 'ER_DUP_ENTRY') throw new ErroNegocio('Você já usou este cupom.', 409);
    throw erro;
  }
}

// Se o agendamento não tem mais nenhum carro válido (todos cancelados ou apagados),
// estorna o cupom usado nele: ele volta a ficar disponível para o cliente.
async function estornarCuponsSeVazio(conn, agendamentoId) {
  if (!agendamentoId) return;
  const [[restantes]] = await conn.execute(
    "SELECT COUNT(*) AS total FROM execucoes WHERE agendamento_id = ? AND status <> 'Cancelado'",
    [agendamentoId]
  );
  if (Number(restantes.total) === 0) {
    await conn.execute("UPDATE cupom_usos SET status = 'estornado' WHERE agendamento_id = ? AND status = 'ativo'", [agendamentoId]);
  }
}

// ---------------------------------------------------------------------
// Painel do admin
// ---------------------------------------------------------------------

async function painelAdmin(db) {
  await garantirPromocaoAutomatica(db);
  const config = await obterConfig(db);

  const [cupons] = await db.execute(
    `SELECT c.*, DATE_FORMAT(c.valido_para_data, '%Y-%m-%d') AS valido_para_data_txt, ex.nome AS extra_nome,
            cl.nome AS cliente_nome,
            (SELECT COUNT(*) FROM cupom_usos u WHERE u.cupom_id = c.id AND u.status = 'ativo') AS usos,
            (SELECT COALESCE(SUM(u.valor_desconto), 0) FROM cupom_usos u WHERE u.cupom_id = c.id AND u.status = 'ativo') AS desconto_total
       FROM cupons c
       LEFT JOIN servicos_extras ex ON ex.id = c.extra_id
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
      ORDER BY c.id DESC
      LIMIT 200`
  );

  const [[totais]] = await db.execute(
    `SELECT COUNT(*) AS resgates, COALESCE(SUM(valor_desconto), 0) AS desconto,
            COUNT(DISTINCT cliente_id) AS clientes
       FROM cupom_usos WHERE status = 'ativo'`
  );

  // Clientes perto do benefício (contagem atual, calculada de execucoes)
  const meta = config.fidelidade_meta_visitas;
  const [ranking] = await db.execute(
    `SELECT c.id, c.nome, COUNT(DISTINCT ${SQL_CHAVE_VISITA.replace(/agendamento_id/g, 'e.agendamento_id').replace(/criado_em/g, 'e.criado_em')}) AS visitas
       FROM clientes c
       JOIN execucoes e ON e.cliente_id = c.id AND e.status = 'Finalizado'
      GROUP BY c.id, c.nome
      ORDER BY visitas DESC
      LIMIT 20`
  );

  return {
    config,
    movimento_hoje: await movimentoDiario(db),
    metricas: {
      resgates: Number(totais.resgates),
      desconto_total: Number(totais.desconto).toFixed(2),
      clientes_que_usaram: Number(totais.clientes),
      cupons_ativos: cupons.filter((c) => c.ativo).length
    },
    clientes_fidelidade: ranking.map((r) => ({
      id: r.id,
      nome: r.nome,
      visitas: Number(r.visitas),
      no_ciclo: Number(r.visitas) % meta,
      faltam: meta - (Number(r.visitas) % meta)
    })),
    cupons: cupons.map((c) => ({
      ...formatarCupom(c),
      ativo: Boolean(c.ativo),
      cliente_nome: c.cliente_nome || null,
      usos: Number(c.usos),
      desconto_total: Number(c.desconto_total).toFixed(2),
      criado_em: c.criado_em
    }))
  };
}

// Liga/desliga promoções relâmpago e manuais. Os de fidelidade seguem a contagem de visitas.
async function alterarAtivo(db, id, ativo) {
  const [[cupom]] = await db.execute('SELECT origem FROM cupons WHERE id = ?', [id]);
  if (!cupom) throw new ErroNegocio('Cupom não encontrado.', 404);
  if (cupom.origem === 'fidelidade') {
    throw new ErroNegocio('Cupons de fidelidade seguem as visitas do cliente e não podem ser desligados aqui.', 409);
  }
  await db.execute('UPDATE cupons SET ativo = ? WHERE id = ?', [Boolean(ativo), id]);
}

module.exports = {
  obterConfig,
  salvarConfig,
  resumoFidelidade,
  movimentoDiario,
  gerarPromocaoMovimento,
  garantirPromocaoAutomatica,
  promocaoParaCliente,
  validarCupom,
  calcularDescontos,
  registrarUso,
  estornarCuponsSeVazio,
  formatarCupom,
  painelAdmin,
  alterarAtivo
};
