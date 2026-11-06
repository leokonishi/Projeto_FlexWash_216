const { ErroNegocio } = require('./erros');
const { calcularValorCentavos, centavosParaDecimal } = require('./precoExecucao');
const { inteiroPositivo, listaDeIds, buscarPorIds, exigirTodos } = require('./execucoesService');
const agenda = require('./agenda');
const { configAtiva, avaliarLevaTras } = require('./logistica');

const MAX_VEICULOS_POR_AGENDAMENTO = 10;
const TIPOS_LOGISTICA = ['cliente_leva', 'leva_tras'];

// Trava única da agenda: dois clientes confirmando ao mesmo tempo não pegam a mesma vaga.
const NOME_TRAVA = 'flexwash_agenda';
const ESPERA_TRAVA_SEGUNDOS = 10;

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

// Carros já marcados em cada horário de um dia: Map 'HH:MM' -> quantidade
async function ocupacaoDoDia(conn, data) {
  const [linhas] = await conn.execute(
    `SELECT TIME_FORMAT(data_agendamento, '%H:%i') AS horario, COUNT(*) AS total
       FROM execucoes
      WHERE data_agendamento >= ? AND data_agendamento < ?
        AND status <> 'Cancelado'
      GROUP BY horario`,
    [`${data} 00:00:00`, `${agenda.somarDias(data, 1)} 00:00:00`]
  );
  return new Map(linhas.map((l) => [l.horario, Number(l.total)]));
}

// O que a tela do cliente precisa saber antes de montar o agendamento.
// Se o leva e traz atende o endereço do cliente (e o valor) sai de
// GET /api/agendamentos/leva-e-traz, que mede a distância no mapa.
async function obterConfiguracao(db) {
  const logistica = await configAtiva(db);
  return {
    horarios: agenda.HORARIOS,
    capacidade_por_horario: agenda.CAPACIDADE_POR_HORARIO,
    max_veiculos: MAX_VEICULOS_POR_AGENDAMENTO,
    endereco_lava_rapido: logistica?.endereco_lava_rapido || null,
    leva_tras: {
      ativo: Boolean(logistica && logistica.latitude !== null),
      raio_km: logistica?.raio_km ?? null
    }
  };
}

// Vagas de cada horário de um dia
async function horariosDoDia(db, data) {
  if (!agenda.dataValida(data)) throw new ErroNegocio('Data inválida. Use o formato AAAA-MM-DD.');

  const agora = agenda.agoraLocal();
  const ocupacao = await ocupacaoDoDia(db, data);
  return agenda.HORARIOS.map((horario) => {
    const passado = agenda.horarioPassou(data, horario, agora);
    const vagas = passado ? 0 : Math.max(0, agenda.CAPACIDADE_POR_HORARIO - (ocupacao.get(horario) || 0));
    return { horario, vagas, passado };
  });
}

// Primeiro dia/horário (a partir de `data`) em que cabem `quantidade` carros
async function buscarSugestao(conn, { data, horarioInicial, quantidade, agora }) {
  for (let i = 0; i <= agenda.DIAS_BUSCA_SUGESTAO; i++) {
    const dia = agenda.somarDias(data, i);
    const ocupacao = await ocupacaoDoDia(conn, dia);
    const alocados = agenda.distribuirNoDia({
      data: dia,
      horarioInicial: i === 0 ? horarioInicial : agenda.HORARIOS[0],
      quantidade,
      ocupacao,
      agora
    });
    if (alocados) return { data: dia, horario: alocados[0] };
  }
  return null;
}

// ---------------------------------------------------------------------
// Validação do pedido
// ---------------------------------------------------------------------

function validarDataHorario(data, horario) {
  if (!agenda.dataValida(data)) throw new ErroNegocio('Escolha uma data válida.');
  if (!agenda.HORARIOS.includes(horario)) throw new ErroNegocio('Escolha um dos horários de atendimento.');
}

// Dois modos:
// - mesmo horário para todos: `data` e `horario` no corpo; os carros que não couberem
//   ocupam os próximos horários do dia;
// - horario_por_veiculo = true: cada carro traz o seu `data` e `horario`, e fica exatamente nele.
function normalizarPedido(corpo) {
  const horarioPorVeiculo = corpo?.horario_por_veiculo === true;
  const data = horarioPorVeiculo ? null : corpo?.data;
  const horario = horarioPorVeiculo ? null : corpo?.horario;
  const tipoLogistica = corpo?.tipo_logistica ?? 'cliente_leva';

  if (!horarioPorVeiculo) validarDataHorario(data, horario);
  if (!TIPOS_LOGISTICA.includes(tipoLogistica)) throw new ErroNegocio('Modalidade de atendimento inválida.');

  const veiculos = corpo?.veiculos;
  if (!Array.isArray(veiculos) || veiculos.length === 0) {
    throw new ErroNegocio('Selecione pelo menos um veículo.');
  }
  if (veiculos.length > MAX_VEICULOS_POR_AGENDAMENTO) {
    throw new ErroNegocio(`Máximo de ${MAX_VEICULOS_POR_AGENDAMENTO} veículos por agendamento.`);
  }

  const vistos = new Set();
  const itens = veiculos.map((v) => {
    const veiculoId = inteiroPositivo(v?.veiculo_id);
    if (veiculoId === null) throw new ErroNegocio('Veículo inválido no agendamento.');
    if (vistos.has(veiculoId)) throw new ErroNegocio('O mesmo veículo foi enviado mais de uma vez.');
    vistos.add(veiculoId);

    const pacoteId = inteiroPositivo(v?.pacote_id);
    if (pacoteId === null) throw new ErroNegocio('Escolha o serviço de cada veículo.');

    const item = { veiculoId, pacoteId, extraIds: listaDeIds(v.extras, 'extras') };
    if (horarioPorVeiculo) {
      validarDataHorario(v.data, v.horario);
      item.data = v.data;
      item.horario = v.horario;
    }
    return item;
  });

  return { horarioPorVeiculo, data, horario, tipoLogistica, itens };
}

// Modo "horário por veículo": confere se cada horário escolhido ainda tem vaga,
// contando os outros carros do mesmo pedido que escolheram o mesmo horário.
async function conferirHorariosIndividuais(conn, itens, veiculos) {
  const ocupacaoPorDia = new Map();
  for (const item of itens) {
    if (!ocupacaoPorDia.has(item.data)) ocupacaoPorDia.set(item.data, await ocupacaoDoDia(conn, item.data));
  }

  return itens.map((item) => {
    const ocupacao = ocupacaoPorDia.get(item.data);
    const usados = ocupacao.get(item.horario) || 0;
    if (usados >= agenda.CAPACIDADE_POR_HORARIO) {
      const v = veiculos.get(item.veiculoId);
      const [ano, mes, dia] = item.data.split('-');
      throw new ErroNegocio(
        `Não há vaga para o ${v.marca} ${v.modelo} em ${dia}/${mes}/${ano} às ${item.horario}. Escolha outro horário para ele.`,
        409
      );
    }
    ocupacao.set(item.horario, usados + 1);
    return { data: item.data, horario: item.horario };
  });
}

// ---------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------

// Registra o agendamento de 1..N carros do cliente logado.
// - Mesmo horário para todos: cada carro ocupa o primeiro horário a partir do escolhido
//   que ainda tenha vaga (CAPACIDADE_POR_HORARIO por horário). Se não couber até o fim do
//   dia, recusa com 409 e devolve em `sugestao` o próximo dia/horário em que todos cabem.
// - Horário por veículo: cada carro fica no horário que o cliente escolheu para ele; se
//   algum estiver lotado, recusa com 409 dizendo qual.
// - O preço de cada carro sai do banco (pacote + extras pelo porte, mais a taxa do
//   leva e traz por carro), nunca do navegador.
// - Leva e traz: a distância até o endereço do cliente é medida de novo aqui; fora do
//   raio, o pedido é recusado.
// - Tudo é gravado numa transação, com a agenda travada enquanto isso.
async function registrarAgendamento(db, clienteId, corpo) {
  const { horarioPorVeiculo, data, horario, tipoLogistica, itens } = normalizarPedido(corpo);

  const agora = agenda.agoraLocal();
  const pedidos = horarioPorVeiculo ? itens : [{ data, horario }];
  if (pedidos.some((p) => agenda.horarioPassou(p.data, p.horario, agora))) {
    throw new ErroNegocio('Esse horário já passou. Escolha um horário futuro.');
  }

  // Leva e traz: confere o raio antes de travar a agenda (consulta o mapa, pode demorar)
  let taxaCentavos = 0;
  let enderecoBusca = null;
  let distanciaKm = null;
  if (tipoLogistica === 'leva_tras') {
    const avaliacao = await avaliarLevaTras(db, clienteId);
    if (!avaliacao.disponivel) throw new ErroNegocio(avaliacao.mensagem, 409, { motivo: avaliacao.motivo });
    taxaCentavos = Math.round(Number(avaliacao.taxa_por_veiculo) * 100);
    enderecoBusca = avaliacao.endereco_cliente;
    distanciaKm = avaliacao.distancia_km;
  }

  const conn = await db.getConnection();
  let travou = false;
  try {
    const [[trava]] = await conn.query('SELECT GET_LOCK(?, ?) AS ok', [NOME_TRAVA, ESPERA_TRAVA_SEGUNDOS]);
    travou = Number(trava.ok) === 1;
    if (!travou) throw new ErroNegocio('A agenda está ocupada agora. Tente de novo em instantes.', 503);

    await conn.beginTransaction();

    const veiculoIds = itens.map((i) => i.veiculoId);
    const pacoteIds = [...new Set(itens.map((i) => i.pacoteId))];
    const extraIds = [...new Set(itens.flatMap((i) => i.extraIds))];

    const veiculos = await buscarPorIds(
      conn,
      'SELECT id, porte, marca, modelo FROM veiculos WHERE cliente_id = ? AND id IN (#)',
      veiculoIds,
      [clienteId]
    );
    exigirTodos(veiculos, veiculoIds, 404, 'Veículo(s) não encontrado(s) na sua conta');

    const pacotes = await buscarPorIds(
      conn,
      'SELECT id, nome, preco_pequeno, preco_medio, preco_grande FROM pacotes WHERE id IN (#)',
      pacoteIds
    );
    exigirTodos(pacotes, pacoteIds, 404, 'Serviço(s) não encontrado(s)');

    const extras = await buscarPorIds(
      conn,
      'SELECT id, nome, preco_pequeno, preco_medio, preco_grande FROM servicos_extras WHERE id IN (#)',
      extraIds
    );
    exigirTodos(extras, extraIds, 404, 'Serviço(s) extra(s) não encontrado(s)');

    // Data e horário de cada carro: [{ data, horario }], na ordem de `itens`
    let vagas;
    if (horarioPorVeiculo) {
      vagas = await conferirHorariosIndividuais(conn, itens, veiculos);
    } else {
      const ocupacao = await ocupacaoDoDia(conn, data);
      const horarios = agenda.distribuirNoDia({ data, horarioInicial: horario, quantidade: itens.length, ocupacao, agora });
      if (!horarios) {
        const sugestao = await buscarSugestao(conn, { data, horarioInicial: horario, quantidade: itens.length, agora });
        const qtd = itens.length === 1 ? 'o veículo' : `os ${itens.length} veículos`;
        throw new ErroNegocio(`Não há vagas para ${qtd} a partir desse horário nesse dia.`, 409, { sugestao });
      }
      vagas = horarios.map((h) => ({ data, horario: h }));
    }

    const [resAgendamento] = await conn.execute(
      'INSERT INTO agendamentos (cliente_id, tipo_logistica, endereco_busca, distancia_km) VALUES (?, ?, ?, ?)',
      [clienteId, tipoLogistica, enderecoBusca, distanciaKm]
    );
    const agendamentoId = resAgendamento.insertId;

    const criados = [];
    let totalCentavos = 0;
    for (const [indice, item] of itens.entries()) {
      const lavagemCentavos = calcularValorCentavos({
        porte: veiculos.get(item.veiculoId).porte,
        pacote: pacotes.get(item.pacoteId),
        extras: item.extraIds.map((id) => extras.get(id))
      });
      const totalItem = lavagemCentavos + taxaCentavos;
      totalCentavos += totalItem;

      const [resExecucao] = await conn.execute(
        `INSERT INTO execucoes
           (cliente_id, veiculo_id, pacote_id, agendamento_id, data_agendamento, valor_total, valor_logistica, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Agendado')`,
        [
          clienteId,
          item.veiculoId,
          item.pacoteId,
          agendamentoId,
          agenda.paraDatetime(vagas[indice].data, vagas[indice].horario),
          centavosParaDecimal(totalItem),
          centavosParaDecimal(taxaCentavos)
        ]
      );

      for (const extraId of item.extraIds) {
        await conn.execute('INSERT INTO execucao_extras (execucao_id, extra_id) VALUES (?, ?)', [
          resExecucao.insertId,
          extraId
        ]);
      }

      criados.push({
        execucao_id: resExecucao.insertId,
        veiculo_id: item.veiculoId,
        data: vagas[indice].data,
        horario: vagas[indice].horario,
        valor_lavagem: centavosParaDecimal(lavagemCentavos),
        valor_logistica: centavosParaDecimal(taxaCentavos),
        valor_total: centavosParaDecimal(totalItem)
      });
    }

    await conn.commit();
    return {
      agendamento_id: agendamentoId,
      tipo_logistica: tipoLogistica,
      distancia_km: distanciaKm,
      valor_total: centavosParaDecimal(totalCentavos),
      veiculos: criados
    };
  } catch (erro) {
    try {
      await conn.rollback();
    } catch (erroRollback) {
      console.error('Falha ao desfazer a transação do agendamento:', erroRollback.message);
    }
    throw erro;
  } finally {
    if (travou) {
      await conn.query('SELECT RELEASE_LOCK(?)', [NOME_TRAVA]).catch(() => {});
    }
    conn.release();
  }
}

module.exports = {
  registrarAgendamento,
  horariosDoDia,
  obterConfiguracao,
  normalizarPedido,
  MAX_VEICULOS_POR_AGENDAMENTO
};
