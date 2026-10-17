const { ErroNegocio } = require('./erros');
const { calcularValorCentavos, centavosParaDecimal } = require('./precoExecucao');

const MAX_VEICULOS_POR_ENTRADA = 20;

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

  const vistos = new Set();
  const itens = veiculos.map((v) => {
    const veiculoId = inteiroPositivo(v?.veiculo_id);
    if (veiculoId === null) throw new ErroNegocio('Veículo inválido na entrada.');
    if (vistos.has(veiculoId)) throw new ErroNegocio('O mesmo veículo foi enviado mais de uma vez.');
    vistos.add(veiculoId);

    let pacoteId = null;
    if (v.pacote_id !== undefined && v.pacote_id !== null && v.pacote_id !== '') {
      pacoteId = inteiroPositivo(v.pacote_id);
      if (pacoteId === null) throw new ErroNegocio('Pacote inválido na entrada.');
    }

    return {
      veiculoId,
      pacoteId,
      extraIds: listaDeIds(v.extras, 'extras'),
      funcionarioIds: listaDeIds(v.funcionarios, 'funcionarios')
    };
  });

  return { clienteId, itens };
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

// Registra a entrada de 1..N veículos no pátio.
// - Confere que cada veículo é do cliente informado e que pacote, extras e funcionários existem.
// - Calcula o valor de cada execução a partir dos preços do banco e do porte do veículo.
// - Grava execução + extras + funcionários numa única transação: ou entra tudo, ou nada.
// `db` é o pool do mysql2/promise (precisa de getConnection()).
async function registrarEntrada(db, corpo) {
  const { clienteId, itens } = normalizarEntrada(corpo);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const veiculoIds = itens.map((i) => i.veiculoId);
    const pacoteIds = [...new Set(itens.map((i) => i.pacoteId).filter((id) => id !== null))];
    const extraIds = [...new Set(itens.flatMap((i) => i.extraIds))];
    const funcionarioIds = [...new Set(itens.flatMap((i) => i.funcionarioIds))];

    const veiculos = await buscarPorIds(
      conn,
      'SELECT id, porte FROM veiculos WHERE cliente_id = ? AND id IN (#)',
      veiculoIds,
      [clienteId]
    );
    exigirTodos(veiculos, veiculoIds, 404, 'Veículo(s) não encontrado(s) para este cliente');

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

    const criadas = [];
    for (const item of itens) {
      const centavos = calcularValorCentavos({
        porte: veiculos.get(item.veiculoId).porte,
        pacote: item.pacoteId === null ? null : pacotes.get(item.pacoteId),
        extras: item.extraIds.map((id) => extras.get(id))
      });
      const valorTotal = centavosParaDecimal(centavos);

      const [resultado] = await conn.execute(
        'INSERT INTO execucoes (cliente_id, veiculo_id, pacote_id, valor_total) VALUES (?, ?, ?, ?)',
        [clienteId, item.veiculoId, item.pacoteId, valorTotal]
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
    return { execucoes: criadas };
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

module.exports = { registrarEntrada, normalizarEntrada, MAX_VEICULOS_POR_ENTRADA };
