const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const agenda = require('../services/agenda');

const cfg = (extra = {}) => ({ ...agenda.PADRAO, bloqueios: new Map(), ...extra });

describe('Datas da agenda', () => {
  test('dia da semana (0 = domingo ... 6 = sábado)', () => {
    assert.equal(agenda.diaDaSemana('2026-11-15'), 0);
    assert.equal(agenda.diaDaSemana('2026-11-17'), 2);
    assert.equal(agenda.diaDaSemana('2026-11-21'), 6);
  });

  test('data válida só no formato AAAA-MM-DD e existindo no calendário', () => {
    assert.equal(agenda.dataValida('2026-11-17'), true);
    assert.equal(agenda.dataValida('2028-02-29'), true); // bissexto
    assert.equal(agenda.dataValida('2026-02-29'), false);
    assert.equal(agenda.dataValida('2026-02-30'), false);
    assert.equal(agenda.dataValida('2026-13-01'), false);
    assert.equal(agenda.dataValida('17/11/2026'), false);
    assert.equal(agenda.dataValida('2026-11-17T10:00'), false);
    assert.equal(agenda.dataValida(''), false);
    assert.equal(agenda.dataValida(null), false);
    assert.equal(agenda.dataValida(20261117), false);
  });

  test('somar dias atravessa mês e ano', () => {
    assert.equal(agenda.somarDias('2026-11-17', 1), '2026-11-18');
    assert.equal(agenda.somarDias('2026-11-30', 1), '2026-12-01');
    assert.equal(agenda.somarDias('2026-12-31', 1), '2027-01-01');
    assert.equal(agenda.somarDias('2026-03-01', -1), '2026-02-28');
    assert.equal(agenda.somarDias('2026-11-17', 0), '2026-11-17');
  });

  test('"agora" usa o horário de Brasília, não o do servidor', () => {
    // 02:30 UTC do dia 18 ainda é 23:30 do dia 17 em São Paulo
    assert.deepEqual(agenda.agoraLocal(new Date('2026-11-18T02:30:00Z')), { data: '2026-11-17', hora: '23:30' });
    assert.deepEqual(agenda.agoraLocal(new Date('2026-11-17T03:00:00Z')), { data: '2026-11-17', hora: '00:00' });
    assert.deepEqual(agenda.agoraLocal(new Date('2026-11-17T15:05:00Z')), { data: '2026-11-17', hora: '12:05' });
  });

  test('data e horário viram o formato do banco', () => {
    assert.equal(agenda.paraDatetime('2026-11-17', '08:00'), '2026-11-17 08:00:00');
  });
});

describe('Horário que já passou', () => {
  const agora = { data: '2026-11-17', hora: '10:00' };

  test('dia anterior já passou, dia seguinte não', () => {
    assert.equal(agenda.horarioPassou('2026-11-16', '17:00', agora), true);
    assert.equal(agenda.horarioPassou('2026-11-18', '08:00', agora), false);
  });

  test('hoje: passou se a hora é anterior ou igual à de agora', () => {
    assert.equal(agenda.horarioPassou('2026-11-17', '09:00', agora), true);
    assert.equal(agenda.horarioPassou('2026-11-17', '10:00', agora), true);
    assert.equal(agenda.horarioPassou('2026-11-17', '11:00', agora), false);
  });
});

describe('Dia fechado', () => {
  test('agenda padrão abre todos os dias', () => {
    assert.equal(agenda.motivoFechado('2026-11-15'), null);
    assert.equal(agenda.motivoFechado('2026-11-17'), null);
  });

  test('dia da semana desligado no painel fica fechado', () => {
    const semDomingo = cfg({ diasSemana: [1, 2, 3, 4, 5, 6] });
    assert.equal(agenda.motivoFechado('2026-11-15', semDomingo), 'Não abrimos neste dia da semana');
    assert.equal(agenda.motivoFechado('2026-11-16', semDomingo), null);
  });

  test('dia bloqueado mostra o motivo cadastrado, ou um texto padrão', () => {
    const comBloqueio = cfg({ bloqueios: new Map([['2026-12-25', 'Natal'], ['2026-12-31', '']]) });
    assert.equal(agenda.motivoFechado('2026-12-25', comBloqueio), 'Natal');
    assert.equal(agenda.motivoFechado('2026-12-31', comBloqueio), 'Fechado neste dia');
    assert.equal(agenda.motivoFechado('2026-12-26', comBloqueio), null);
  });
});

describe('Distribuição dos carros nos horários', () => {
  const ontem = { data: '2026-11-16', hora: '20:00' };
  const base = { data: '2026-11-17', agora: ontem, ocupacao: new Map() };

  test('não existe horário de almoço (12:00)', () => {
    assert.equal(agenda.HORARIOS.includes('12:00'), false);
    assert.equal(agenda.HORARIOS[0], '08:00');
    assert.equal(agenda.HORARIOS.at(-1), '17:00');
  });

  test('dois carros cabem no mesmo horário; o terceiro vai para o seguinte', () => {
    assert.deepEqual(agenda.distribuirNoDia({ ...base, horarioInicial: '08:00', quantidade: 1 }), ['08:00']);
    assert.deepEqual(agenda.distribuirNoDia({ ...base, horarioInicial: '08:00', quantidade: 2 }), ['08:00', '08:00']);
    assert.deepEqual(agenda.distribuirNoDia({ ...base, horarioInicial: '08:00', quantidade: 3 }), ['08:00', '08:00', '09:00']);
  });

  test('conta os carros que já estavam marcados', () => {
    const ocupacao = new Map([['08:00', 2], ['09:00', 1]]);
    assert.deepEqual(
      agenda.distribuirNoDia({ ...base, ocupacao, horarioInicial: '08:00', quantidade: 2 }),
      ['09:00', '10:00']
    );
  });

  test('pula o almoço: depois das 11:00 vem 13:00', () => {
    assert.deepEqual(
      agenda.distribuirNoDia({ ...base, horarioInicial: '11:00', quantidade: 3 }),
      ['11:00', '11:00', '13:00']
    );
  });

  test('não usa horário antes do escolhido nem horário que já passou hoje', () => {
    assert.deepEqual(agenda.distribuirNoDia({ ...base, horarioInicial: '15:00', quantidade: 1 }), ['15:00']);
    const hoje = { data: '2026-11-17', hora: '10:00' };
    assert.deepEqual(
      agenda.distribuirNoDia({ ...base, agora: hoje, horarioInicial: '08:00', quantidade: 1 }),
      ['11:00']
    );
  });

  test('devolve null quando não cabe até o fim do dia', () => {
    assert.equal(agenda.distribuirNoDia({ ...base, horarioInicial: '17:00', quantidade: 3 }), null);
    const cheio = new Map(agenda.HORARIOS.map((h) => [h, 2]));
    assert.equal(agenda.distribuirNoDia({ ...base, ocupacao: cheio, horarioInicial: '08:00', quantidade: 1 }), null);
    const fimDoDia = { data: '2026-11-17', hora: '17:00' };
    assert.equal(agenda.distribuirNoDia({ ...base, agora: fimDoDia, horarioInicial: '08:00', quantidade: 1 }), null);
  });

  test('respeita a agenda configurada no painel (horários e vagas)', () => {
    const personalizada = cfg({ horarios: ['09:00', '10:00'], capacidade: 1 });
    assert.deepEqual(
      agenda.distribuirNoDia({ ...base, cfg: personalizada, horarioInicial: '08:00', quantidade: 2 }),
      ['09:00', '10:00']
    );
    assert.equal(agenda.distribuirNoDia({ ...base, cfg: personalizada, horarioInicial: '08:00', quantidade: 3 }), null);
  });

  test('não altera a ocupação recebida', () => {
    const ocupacao = new Map([['08:00', 1]]);
    agenda.distribuirNoDia({ ...base, ocupacao, horarioInicial: '08:00', quantidade: 3 });
    assert.deepEqual([...ocupacao], [['08:00', 1]]);
  });
});
