const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { inteiroPositivo, listaDeIds, normalizarEntrada, MAX_VEICULOS_POR_ENTRADA } = require('../services/execucoesService');
const { normalizarPedido, MAX_VEICULOS_POR_AGENDAMENTO } = require('../services/agendamentoService');
const { validarPeriodo } = require('../services/comissoes');
const agenda = require('../services/agenda');
const { barra } = require('./apoio');

describe('Ids recebidos pela API', () => {
  test('aceita número inteiro positivo, como número ou texto', () => {
    assert.equal(inteiroPositivo(7), 7);
    assert.equal(inteiroPositivo('7'), 7);
    assert.equal(inteiroPositivo(' 12 '), 12);
  });

  test('recusa zero, negativo, quebrado e o que não é número', () => {
    for (const ruim of [0, -1, 1.5, '0', '-3', '1.5', 'abc', '1 OR 1=1', '', null, undefined, true, [1], {}]) {
      assert.equal(inteiroPositivo(ruim), null, `deveria recusar ${JSON.stringify(ruim)}`);
    }
  });

  test('lista de ids: vazia quando não vem, sem repetidos', () => {
    assert.deepEqual(listaDeIds(undefined, 'extras'), []);
    assert.deepEqual(listaDeIds(null, 'extras'), []);
    assert.deepEqual(listaDeIds([3, '3', 5], 'extras'), [3, 5]);
  });

  test('lista de ids: barra o que não é lista e id inválido', () => {
    barra(() => listaDeIds('1,2', 'extras'), { mensagem: /"extras" deve ser uma lista/ });
    barra(() => listaDeIds([1, 'x'], 'extras'), { mensagem: /id inválido/ });
  });
});

describe('Pedido de agendamento do cliente', () => {
  const pedido = (extra = {}) => ({
    data: '2026-11-20',
    horario: '09:00',
    veiculos: [{ veiculo_id: 1, pacote_id: 2 }],
    ...extra
  });

  test('pedido simples: cliente leva o carro, sem extras e sem cupom', () => {
    assert.deepEqual(normalizarPedido(pedido()), {
      horarioPorVeiculo: false,
      data: '2026-11-20',
      horario: '09:00',
      tipoLogistica: 'cliente_leva',
      itens: [{ veiculoId: 1, pacoteId: 2, extraIds: [] }],
      cupom: null
    });
  });

  test('leva e traz, extras e cupom (em maiúsculas)', () => {
    const p = normalizarPedido(pedido({
      tipo_logistica: 'leva_tras',
      cupom: '  fidelidade10 ',
      veiculos: [{ veiculo_id: '1', pacote_id: '2', extras: [4, 4, 5] }]
    }));
    assert.equal(p.tipoLogistica, 'leva_tras');
    assert.equal(p.cupom, 'FIDELIDADE10');
    assert.deepEqual(p.itens, [{ veiculoId: 1, pacoteId: 2, extraIds: [4, 5] }]);
  });

  test('cupom vazio ou que não é texto é ignorado', () => {
    assert.equal(normalizarPedido(pedido({ cupom: '   ' })).cupom, null);
    assert.equal(normalizarPedido(pedido({ cupom: 123 })).cupom, null);
  });

  test('barra data e horário mal formados', () => {
    barra(() => normalizarPedido(pedido({ data: '20/11/2026' })), { mensagem: /data válida/ });
    barra(() => normalizarPedido(pedido({ data: '2026-02-30' })), { mensagem: /data válida/ });
    barra(() => normalizarPedido(pedido({ data: undefined })));
    barra(() => normalizarPedido(pedido({ horario: '9h' })), { mensagem: /horários de atendimento/ });
    barra(() => normalizarPedido(pedido({ horario: undefined })));
  });

  test('barra modalidade desconhecida', () => {
    barra(() => normalizarPedido(pedido({ tipo_logistica: 'drone' })), { mensagem: /Modalidade de atendimento inválida/ });
  });

  test('barra pedido sem veículo, com veículo repetido ou sem serviço', () => {
    barra(() => normalizarPedido(pedido({ veiculos: [] })), { mensagem: /pelo menos um veículo/ });
    barra(() => normalizarPedido(pedido({ veiculos: undefined })));
    barra(() => normalizarPedido(pedido({ veiculos: [{ veiculo_id: 'x', pacote_id: 2 }] })), { mensagem: /Veículo inválido/ });
    barra(
      () => normalizarPedido(pedido({ veiculos: [{ veiculo_id: 1, pacote_id: 2 }, { veiculo_id: 1, pacote_id: 3 }] })),
      { mensagem: /mais de uma vez/ }
    );
    barra(() => normalizarPedido(pedido({ veiculos: [{ veiculo_id: 1 }] })), { mensagem: /serviço de cada veículo/ });
    barra(() => normalizarPedido(null));
  });

  test('barra mais veículos do que o limite por agendamento', () => {
    const muitos = Array.from({ length: MAX_VEICULOS_POR_AGENDAMENTO + 1 }, (_, i) => ({ veiculo_id: i + 1, pacote_id: 2 }));
    barra(() => normalizarPedido(pedido({ veiculos: muitos })), { mensagem: /Máximo de/ });
    assert.equal(normalizarPedido(pedido({ veiculos: muitos.slice(1) })).itens.length, MAX_VEICULOS_POR_AGENDAMENTO);
  });

  test('horário por veículo: cada carro traz a sua data e o seu horário', () => {
    const p = normalizarPedido({
      horario_por_veiculo: true,
      veiculos: [
        { veiculo_id: 1, pacote_id: 2, data: '2026-11-20', horario: '09:00' },
        { veiculo_id: 3, pacote_id: 2, data: '2026-11-21', horario: '14:00' }
      ]
    });
    assert.equal(p.horarioPorVeiculo, true);
    assert.equal(p.data, null);
    assert.equal(p.horario, null);
    assert.deepEqual(p.itens.map((i) => [i.veiculoId, i.data, i.horario]), [[1, '2026-11-20', '09:00'], [3, '2026-11-21', '14:00']]);
  });

  test('horário por veículo: barra carro sem data', () => {
    barra(
      () => normalizarPedido({ horario_por_veiculo: true, veiculos: [{ veiculo_id: 1, pacote_id: 2, horario: '09:00' }] }),
      { mensagem: /data válida/ }
    );
  });
});

describe('Entrada de carro pelo pátio', () => {
  test('barra sem cliente, sem veículo e acima do limite', () => {
    barra(() => normalizarEntrada({ veiculos: [{ veiculo_id: 1 }] }), { mensagem: /cliente válido/ });
    barra(() => normalizarEntrada({ cliente_id: 1, veiculos: [] }), { mensagem: /Dados incompletos/ });
    const muitos = Array.from({ length: MAX_VEICULOS_POR_ENTRADA + 1 }, (_, i) => ({ veiculo_id: i + 1, pacote_id: 1 }));
    barra(() => normalizarEntrada({ cliente_id: 1, veiculos: muitos }), { mensagem: /Máximo de/ });
  });
});

describe('Período do relatório de comissões', () => {
  test('período informado é devolvido como veio', () => {
    assert.deepEqual(validarPeriodo('2026-10-01', '2026-10-31'), { inicio: '2026-10-01', fim: '2026-10-31' });
    assert.deepEqual(validarPeriodo('2026-10-15', '2026-10-15'), { inicio: '2026-10-15', fim: '2026-10-15' });
  });

  test('sem início, começa no dia 1 do mês da data final', () => {
    assert.deepEqual(validarPeriodo(undefined, '2026-10-20'), { inicio: '2026-10-01', fim: '2026-10-20' });
  });

  test('sem nada, vai do dia 1 do mês até hoje', () => {
    const hoje = agenda.agoraLocal().data;
    assert.deepEqual(validarPeriodo(), { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje });
  });

  test('barra data mal formada e início depois do fim', () => {
    barra(() => validarPeriodo('01/10/2026', '2026-10-31'), { mensagem: /AAAA-MM-DD/ });
    barra(() => validarPeriodo('2026-10-01', '2026-02-30'), { mensagem: /AAAA-MM-DD/ });
    barra(() => validarPeriodo('2026-11-01', '2026-10-31'), { mensagem: /depois da final/ });
  });
});
