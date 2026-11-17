const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const v = require('../services/validacao');
const { barra } = require('./apoio');

describe('CPF', () => {
  test('aceita CPF válido, com ou sem máscara, e devolve formatado', () => {
    assert.equal(v.cpf('52998224725'), '529.982.247-25');
    assert.equal(v.cpf('529.982.247-25'), '529.982.247-25');
    assert.equal(v.cpf(' 111 444 777 35 '), '111.444.777-35');
  });

  test('barra dígito verificador errado', () => {
    barra(() => v.cpf('529.982.247-26'), { mensagem: /CPF inválido/ });
    barra(() => v.cpf('529.982.247-15'));
  });

  test('barra números repetidos, tamanho errado e vazio', () => {
    barra(() => v.cpf('111.111.111-11'));
    barra(() => v.cpf('5299822472'));
    barra(() => v.cpf('529982247250'));
    barra(() => v.cpf(''));
    barra(() => v.cpf(null));
  });

  test('na edição, CPF antigo que não mudou continua aceito', () => {
    assert.equal(v.cpfNaEdicao('123.456.789-00', '123.456.789-00'), '123.456.789-00');
    assert.equal(v.cpfNaEdicao('12345678900', '123.456.789-00'), '123.456.789-00');
  });

  test('na edição, CPF trocado precisa ser válido', () => {
    assert.equal(v.cpfNaEdicao('52998224725', '123.456.789-00'), '529.982.247-25');
    barra(() => v.cpfNaEdicao('111.111.111-11', '123.456.789-00'));
    barra(() => v.cpfNaEdicao('123.456.789-00', null));
  });
});

describe('Telefone', () => {
  test('aceita celular e fixo com DDD e devolve formatado', () => {
    assert.equal(v.telefone('11999998888'), '(11) 99999-8888');
    assert.equal(v.telefone('(11) 99999-8888'), '(11) 99999-8888');
    assert.equal(v.telefone('1133334444'), '(11) 3333-4444');
  });

  test('barra sem DDD, celular sem o 9 e vazio', () => {
    barra(() => v.telefone('999998888'), { mensagem: /Telefone inválido/ });
    barra(() => v.telefone('11899998888'));
    barra(() => v.telefone(''));
    barra(() => v.telefone(undefined));
  });
});

describe('E-mail', () => {
  test('devolve em minúsculas e sem espaços nas pontas', () => {
    assert.equal(v.email('  Maria.Silva@Gmail.com '), 'maria.silva@gmail.com');
    assert.equal(v.email('joao+lava@empresa.com.br'), 'joao+lava@empresa.com.br');
  });

  test('vazio vira null quando é opcional e é barrado quando obrigatório', () => {
    assert.equal(v.email(''), null);
    assert.equal(v.email(null), null);
    barra(() => v.email('', { obrigatorio: true }), { mensagem: /Informe o e-mail/ });
  });

  test('barra formatos errados', () => {
    for (const ruim of ['maria', 'maria@', '@gmail.com', 'maria@gmail', 'maria silva@gmail.com', 'maria@gmail.c']) {
      barra(() => v.email(ruim), { mensagem: /E-mail inválido/ });
    }
    barra(() => v.email(`${'a'.repeat(150)}@gmail.com`));
  });
});

describe('Nome', () => {
  test('tira espaços sobrando', () => {
    assert.equal(v.nome('  Maria   da  Silva '), 'Maria da Silva');
  });

  test('barra vazio, uma letra só e mais de 100 caracteres', () => {
    barra(() => v.nome(''), { mensagem: /Informe o nome/ });
    barra(() => v.nome('   '));
    barra(() => v.nome('A'));
    barra(() => v.nome('a'.repeat(101)), { mensagem: /100 caracteres/ });
    assert.equal(v.nome('a'.repeat(100)).length, 100);
  });
});

describe('Senha', () => {
  test('aceita 8 caracteres ou mais com letra e número', () => {
    assert.equal(v.senha('senha123'), 'senha123');
    assert.equal(v.senha('A1b2c3d4e5'), 'A1b2c3d4e5');
  });

  test('barra curta, só letras, só números, longa demais e o que não é texto', () => {
    barra(() => v.senha('abc1234'), { mensagem: /pelo menos 8 caracteres/ });
    barra(() => v.senha('somenteletras'));
    barra(() => v.senha('1234567890'));
    barra(() => v.senha(`a1${'x'.repeat(71)}`));
    barra(() => v.senha(12345678));
    barra(() => v.senha(undefined));
  });
});
