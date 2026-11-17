const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const limite = require('../services/limiteLogin');

const MINUTO = 60 * 1000;

// Cada teste usa um e-mail e um IP próprios, porque o contador fica na memória do processo.
let n = 0;
let email;
let ip;
beforeEach(() => {
  n += 1;
  email = `pessoa${n}@teste.com`;
  ip = `10.0.0.${n}`;
});

const errar = (vezes, e = email, i = ip, tipo = 'cliente') => {
  let restam;
  for (let k = 0; k < vezes; k++) restam = limite.registrarFalha(tipo, e, i);
  return restam;
};

describe('Limite de tentativas de login', () => {
  test('quem nunca errou não está bloqueado', () => {
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 0);
  });

  test('avisa quantas tentativas restam a cada senha errada', () => {
    assert.equal(limite.MAX_POR_EMAIL, 5);
    assert.equal(limite.registrarFalha('cliente', email, ip), 4);
    assert.equal(limite.registrarFalha('cliente', email, ip), 3);
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 0);
  });

  test('5 senhas erradas bloqueiam o e-mail por 15 minutos', () => {
    assert.equal(errar(4), 1);
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 0);
    assert.equal(errar(1), 0);
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 15);
  });

  test('o bloqueio vale de qualquer aparelho e ignora maiúsculas no e-mail', () => {
    errar(5);
    assert.equal(limite.minutosBloqueado('cliente', email.toUpperCase(), '10.9.9.9'), 15);
  });

  test('o bloqueio de um e-mail não atinge outro e-mail', () => {
    errar(5);
    assert.equal(limite.minutosBloqueado('cliente', `outro${n}@teste.com`, '10.9.9.8'), 0);
  });

  test('login de cliente e login da equipe têm contadores separados', () => {
    errar(5);
    assert.equal(limite.minutosBloqueado('gestao', email, '10.9.9.7'), 0);
  });

  test('login certo zera o contador do e-mail', () => {
    errar(4);
    limite.limparEmail('cliente', email);
    assert.equal(limite.registrarFalha('cliente', email, ip), 4);
  });

  test('o bloqueio acaba depois de 15 minutos', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-17T12:00:00Z') });
    errar(5);
    t.mock.timers.tick(14 * MINUTO);
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 1);
    t.mock.timers.tick(MINUTO);
    assert.equal(limite.minutosBloqueado('cliente', email, ip), 0);
    assert.equal(limite.registrarFalha('cliente', email, ip), 4);
  });

  test('erros antigos (mais de 15 minutos) não contam', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-17T12:00:00Z') });
    errar(4);
    t.mock.timers.tick(16 * MINUTO);
    assert.equal(limite.registrarFalha('cliente', email, ip), 4);
  });

  test('30 erros do mesmo aparelho, em e-mails diferentes, bloqueiam o aparelho', () => {
    for (let k = 0; k < 29; k++) limite.registrarFalha('cliente', `varios${n}-${k}@teste.com`, ip);
    assert.equal(limite.minutosBloqueado('cliente', `novo${n}@teste.com`, ip), 0);
    limite.registrarFalha('cliente', `varios${n}-29@teste.com`, ip);
    assert.equal(limite.minutosBloqueado('cliente', `novo${n}@teste.com`, ip), 15);
    assert.equal(limite.minutosBloqueado('cliente', `novo${n}@teste.com`, '10.9.9.6'), 0);
  });
});
