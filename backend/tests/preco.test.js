const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const preco = require('../services/precoExecucao');
const { barra } = require('./apoio');

const lavagem = { id: 1, nome: 'Lavagem completa', preco_pequeno: '50.00', preco_medio: '60.00', preco_grande: '80.00' };
const cera = { id: 2, nome: 'Cera', preco_pequeno: '19.90', preco_medio: '24.90', preco_grande: '29.90' };
const aspiracao = { id: 3, nome: 'Aspiração', preco_pequeno: 0.1, preco_medio: 0.2, preco_grande: 0.3 };

describe('Porte do veículo', () => {
  test('aceita com acento, maiúsculas e espaços', () => {
    assert.equal(preco.normalizarPorte('Pequeno'), 'pequeno');
    assert.equal(preco.normalizarPorte('Médio'), 'medio');
    assert.equal(preco.normalizarPorte(' MÉDIA '), 'medio');
    assert.equal(preco.normalizarPorte('grande'), 'grande');
  });

  test('porte desconhecido vira null', () => {
    assert.equal(preco.normalizarPorte('gigante'), null);
    assert.equal(preco.normalizarPorte(''), null);
    assert.equal(preco.normalizarPorte(null), null);
  });
});

describe('Preço do serviço', () => {
  test('usa o preço do porte do carro, em centavos', () => {
    assert.equal(preco.precoEmCentavos(lavagem, 'Pequeno'), 5000);
    assert.equal(preco.precoEmCentavos(lavagem, 'Médio'), 6000);
    assert.equal(preco.precoEmCentavos(lavagem, 'Grande'), 8000);
    assert.equal(preco.precoEmCentavos(cera, 'Médio'), 2490);
  });

  test('barra porte desconhecido e preço mal cadastrado', () => {
    barra(() => preco.precoEmCentavos(lavagem, 'Gigante'), { status: 422, mensagem: /Porte de veículo desconhecido/ });
    barra(() => preco.precoEmCentavos({ nome: 'Sem preço' }, 'Pequeno'), { status: 422, mensagem: /Preço inválido/ });
    barra(() => preco.precoEmCentavos({ nome: 'Negativo', preco_pequeno: -5 }, 'Pequeno'), { status: 422 });
    barra(() => preco.precoEmCentavos({ nome: 'Texto', preco_pequeno: 'abc' }, 'Pequeno'), { status: 422 });
  });

  test('total = pacote + extras', () => {
    assert.equal(preco.calcularValorCentavos({ porte: 'Médio', pacote: lavagem, extras: [cera] }), 8490);
    assert.equal(preco.calcularValorCentavos({ porte: 'Grande', pacote: lavagem, extras: [] }), 8000);
  });

  test('entrada só com extras (sem pacote)', () => {
    assert.equal(preco.calcularValorCentavos({ porte: 'Pequeno', pacote: null, extras: [cera] }), 1990);
    assert.equal(preco.calcularValorCentavos({ porte: 'Pequeno', pacote: null, extras: [] }), 0);
  });

  test('a soma não perde centavos (0,10 + 0,20 = 0,30)', () => {
    const itens = [aspiracao, { ...aspiracao, preco_pequeno: 0.2 }];
    assert.equal(preco.calcularValorCentavos({ porte: 'Pequeno', pacote: null, extras: itens }), 30);
  });

  test('centavos viram o texto que o banco aceita', () => {
    assert.equal(preco.centavosParaDecimal(8490), '84.90');
    assert.equal(preco.centavosParaDecimal(5), '0.05');
    assert.equal(preco.centavosParaDecimal(0), '0.00');
  });
});
