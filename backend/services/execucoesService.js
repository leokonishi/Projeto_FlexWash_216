const { ErroNegocio } = require('./erros');
const { calcularValorCentavos, centavosParaDecimal } = require('./precoExecucao');
const { avaliarLevaTras } = require('./logistica');

const MAX_VEICULOS_POR_ENTRADA = 20;
const TIPOS_LOGISTICA = ['cliente_leva', 'leva_tras'];

// Status de um carro que está no pátio (chegou e ainda não foi finalizado).
// Regra: cada carro só pode ter UM serviço nesses status por vez. Agendamentos
// futuros ('Agendado') podem ser vários.
const STATUS_NO_PATIO = ['Aguardando', 'Em Andamento'];

// Aceita número inteiro positivo ou string só com dígitos (o <select> do frontend envia string).
function inteiroPositivo(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) && valor > 0 ? valor : null;
  if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) {
    const n = Number(valor);
    return n > 0 ? n : null;
  }
  return null;
}

function listaDeIds(valor, campo) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new ErroNegocio(`"${campo}" deve ser uma lista de ids.`);

  const ids = valor.map((v) => {
    const id = inteiroPositivo(v);
    if (id === null) throw new ErroNegocio(`"${campo}" contém um id inválido.`);
    return id;
  });
  return [...new Set(ids)]; // sem repetidos (a chave primária de execucao_extras/funcionarios é composta)
}

// Valida o corpo da requisição. Repare que valor_total NÃO é lido: o preço é sempre calculado aqui.
function normalizarEntrada(corpo) {
  const clienteId = inteiroPositivo(corpo?.cliente_id);
  if (clienteId === null) throw new ErroNegocio('Informe um cliente válido.');

  const veiculos = corpo?.veiculos;
  if (!Array.isArray(veiculos) || veiculos.length === 0) {
    throw new ErroNegocio('Dados incompletos para iniciar o serviço.');
  }
  if (veiculos.length > MAX_VEICULOS_POR_ENTRADA) {
    throw new ErroNegocio(`Máximo de ${MAX_VEICULOS_POR_ENTRADA} veículos por entrada.`);
  }

  const tipoLogistica = corpo?.tipo_logistica ?? 'cliente_leva';
  if (!TIPOS_LOGISTICA.includes(tipoLogistica)) throw new ErroNegocio('Modalidade de atendimento inválida.');

  const vistos = new Set();
  const itens = veiculos.map((v) => {
    const veiculoId = inteiroPositivo(v?.veiculo_id);
    if (veiculoId === null) throw new ErroNegocio('Veículo inválido na entrada.');
    if (vistos.has(veiculoId)) throw new ErroNegocio('O mesmo veículo foi enviado mais de uma vez.');
    vistos.add(veiculoId);

    // O pacote é obrigatório para cada carro (mesma regra do agendamento do cliente)
    if (v.pacote_id === undefined || v.pacote_id === null || v.pacote_id === '') {
      throw new ErroNegocio('Escolha o pacote de cada veículo.');
    }
    const pacoteId = inteiroPositivo(v.pacote_id);
    if (pacoteId === null) throw new ErroNegocio('Pacote inválido na entrada.');

    return {
      veiculoId,
      pacoteId,
      extraIds: listaDeIds(v.extras, 'extras'),
      funcionarioIds: listaDeIds(v.funcionarios, 'funcionarios')
    };
  });

  return { clienteId, tipoLogistica, itens };
}

const marcadores = (ids) => ids.map(() => '?').join(', ');

// Busca as linhas de uma tabela por lista de ids e devolve um Map id -> linha.
// O "(#)" do SQL vira a lista de "?" dos ids; `paramsAntes` são os parâmetros que vêm antes dela no SQL.
async function buscarPorIds(conn, sql, ids, paramsAntes = []) {
  if (ids.length === 0) return new Map();
  const [linhas] = await conn.execute(sql.replace('(#)', `(${marcadores(ids)})`), [...paramsAntes, ...ids]);
  return new Map(linhas.map((l) => [Number(l.id), l]));
}

function exigirTodos(mapa, ids, status, mensagem) {
  const faltando = ids.filter((id) => !mapa.has(id));
  if (faltando.length > 0) throw new ErroNegocio(`${mensagem}: ${faltando.join(', ')}.`, status);
}

const nomeDoCarro = (v) => `${v.marca} ${v.modelo}${v.placa ? ` (${v.placa})` : ''}`;

// Garante que nenhum dos veículos já está no pátio (Aguardando / Em Andamento).
// Deve rodar dentro de uma transação: trava as linhas dos veículos (FOR UPDATE), então
// duas entradas do mesmo carro ao mesmo tempo (ex.: clique duplo) ficam uma na fila da
// outra, e a segunda já enxerga a primeira e é recusada.
// `ignorarExecucaoId`: a própria execução que está mudando de status.
async function exigirForaDoPatio(conn, veiculoIds, { ignorarExecucaoId = null } = {}) {
  if (veiculoIds.length === 0) return;
  await conn.execute(`SELECT id FROM veiculos WHERE id IN (${marcadores(veiculoIds)}) FOR UPDATE`, veiculoIds);

  const [abertas] = await conn.execute(
    `SELECT e.id, e.status, v.marca, v.modelo, v.placa
       FROM execucoes e
       JOIN veiculos v ON v.id = e.veiculo_id
      WHERE e.veiculo_id IN (${marcadores(veiculoIds)})
        AND e.status IN (${marcadores(STATUS_NO_PATIO)})
        AND e.id <> ?
      LIMIT 1
      FOR UPDATE`,
    [...veiculoIds, ...STATUS_NO_PATIO, ignorarExecucaoId ?? 0]
  );
  if (abertas.length > 0) {
    const a = abertas[0];
    throw new ErroNegocio(
      `O ${nomeDoCarro(a)} já está no pátio (${a.status}). Finalize o serviço atual antes de abrir outro para ele.`,
      409
    );
  }
}

// Registra a entrada de 1..N veículos no pátio.
// - Confere que cada veículo é do cliente informado e que pacote, extras e funcionários existem.
// - Calcula o valor de cada execução a partir dos preços do banco e do porte do veículo.
// - Leva e traz (tipo_logistica = 'leva_tras'): confere o raio no endereço do cliente,
//   cria o registro em `agendamentos` (como no agendamento do cliente) e soma a taxa
//   por veículo no valor de cada carro.
// - Grava execução + extras + funcionários numa única transação: ou entra tudo, ou nada.
// `db` é o pool do mysql2/promise (precisa de getConnection()).
async function registrarEntrada(db, corpo) {
  const { clienteId, tipoLogistica, itens } = normalizarEntrada(corpo);

  // Leva e traz: mede a distância antes de abrir a transação (consulta o mapa, pode demorar)
  let levaTras = null;
  if (tipoLogistica === 'leva_tras') {
    const avaliacao = await avaliarLevaTras(db, clienteId);
    if (!avaliacao.disponivel) throw new ErroNegocio(avaliacao.mensagem, 409, { motivo: avaliacao.motivo });
    levaTras = {
      taxaCentavos: Math.round(Number(avaliacao.taxa_por_veiculo) * 100),
      endereco: avaliacao.endereco_cliente,
      distanciaKm: avaliacao.distancia_km
    };
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const veiculoIds = itens.map((i) => i.veiculoId);
    const pacoteIds = [...new Set(itens.map((i) => i.pacoteId))];
    const extraIds = [...new Set(itens.flatMap((i) => i.extraIds))];
    const funcionarioIds = [...new Set(itens.flatMap((i) => i.funcionarioIds))];

    const veiculos = await buscarPorIds(
      conn,
      'SELECT id, porte FROM veiculos WHERE cliente_id = ? AND id IN (#)',
      veiculoIds,
      [clienteId]
    );
    exigirTodos(veiculos, veiculoIds, 404, 'Veículo(s) não encontrado(s) para este cliente');

    // Um carro só pode ter um serviço aberto no pátio por vez
    await exigirForaDoPatio(conn, veiculoIds);

    const pacotes = await buscarPorIds(
      conn,
      'SELECT id, nome, preco_pequeno, preco_medio, preco_grande FROM pacotes WHERE id IN (#)',
      pacoteIds
    );
    exigirTodos(pacotes, pacoteIds, 404, 'Pacote(s) não encontrado(s)');

    const extras = await buscarPorIds(
      conn,
      'SELECT id, nome, preco_pequeno, preco_medio, preco_grande FROM servicos_extras WHERE id IN (#)',
      extraIds
    );
    exigirTodos(extras, extraIds, 404, 'Extra(s) não encontrado(s)');

    const funcionarios = await buscarPorIds(conn, 'SELECT id FROM funcionarios WHERE id IN (#)', funcionarioIds);
    exigirTodos(funcionarios, funcionarioIds, 404, 'Funcionário(s) não encontrado(s)');

    // Mesmo registro que o agendamento do cliente usa para o leva e traz (endereço e distância)
    let agendamentoId = null;
    if (levaTras) {
      const [resAgendamento] = await conn.execute(
        "INSERT INTO agendamentos (cliente_id, tipo_logistica, endereco_busca, distancia_km) VALUES (?, 'leva_tras', ?, ?)",
        [clienteId, levaTras.endereco, levaTras.distanciaKm]
      );
      agendamentoId = resAgendamento.insertId;
    }
    const taxaCentavos = levaTras ? levaTras.taxaCentavos : 0;

    const criadas = [];
    for (const item of itens) {
      const centavos = calcularValorCentavos({
        porte: veiculos.get(item.veiculoId).porte,
        pacote: pacotes.get(item.pacoteId),
        extras: item.extraIds.map((id) => extras.get(id))
      }) + taxaCentavos;
      const valorTotal = centavosParaDecimal(centavos);

      const [resultado] = await conn.execute(
        'INSERT INTO execucoes (cliente_id, veiculo_id, pacote_id, agendamento_id, valor_total, valor_logistica) VALUES (?, ?, ?, ?, ?, ?)',
        [clienteId, item.veiculoId, item.pacoteId, agendamentoId, valorTotal, centavosParaDecimal(taxaCentavos)]
      );
      const execucaoId = resultado.insertId;

      for (const extraId of item.extraIds) {
        await conn.execute('INSERT INTO execucao_extras (execucao_id, extra_id) VALUES (?, ?)', [execucaoId, extraId]);
      }
      for (const funcionarioId of item.funcionarioIds) {
        await conn.execute(
          'INSERT INTO execucao_funcionarios (execucao_id, funcionario_id) VALUES (?, ?)',
          [execucaoId, funcionarioId]
        );
      }

      criadas.push({ id: execucaoId, veiculo_id: item.veiculoId, valor_total: valorTotal });
    }

    await conn.commit();
    return { tipo_logistica: tipoLogistica, execucoes: criadas };
  } catch (erro) {
    try {
      await conn.rollback();
    } catch (erroRollback) {
      console.error('Falha ao desfazer a transação:', erroRollback.message);
    }
    throw erro;
  } finally {
    conn.release();
  }
}

module.exports = {
  registrarEntrada,
  normalizarEntrada,
  exigirForaDoPatio,
  nomeDoCarro,
  STATUS_NO_PATIO,
  MAX_VEICULOS_POR_ENTRADA,
  // reaproveitados pelo agendamento do cliente (services/agendamentoService.js)
  inteiroPositivo,
  listaDeIds,
  buscarPorIds,
  exigirTodos
};
