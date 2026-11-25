process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-32-caracteres!!';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { criarLimite } = require('../services/limitePorIp');
const acesso = require('../services/acessoCliente');

describe('Limite por IP (rotas públicas)', () => {
  test('libera até o máximo e depois avisa os minutos que faltam', () => {
    const limite = criarLimite({ max: 2, janelaMs: 60 * 60 * 1000 });
    const t = 1_000_000;
    assert.equal(limite.consumir('1.1.1.1', t), 0);
    assert.equal(limite.consumir('1.1.1.1', t), 0);
    assert.equal(limite.consumir('1.1.1.1', t), 60);
    assert.equal(limite.consumir('2.2.2.2', t), 0, 'outro IP não é afetado');
  });

  test('a contagem zera quando a janela passa', () => {
    const limite = criarLimite({ max: 1, janelaMs: 1000 });
    assert.equal(limite.consumir('ip', 0), 0);
    assert.ok(limite.consumir('ip', 500) > 0);
    assert.equal(limite.consumir('ip', 1000), 0);
  });
});

// Banco falso: devolve a pessoa com a senha guardada
const bancoCom = (pessoa) => ({
  execute: async (sql) => {
    bancoCom.ultimoSql = sql;
    return [[pessoa]];
  }
});

const tokenDo = (link) => decodeURIComponent(new URL(link).searchParams.get('token'));

describe('Link de troca de senha da equipe', () => {
  const pessoa = { id: 7, nome: 'Ana Souza', email: 'ana@flexwash.com', senha: 'hash-antigo' };

  test('aponta para a tela da gestão e consulta a tabela de funcionários', async () => {
    const link = acesso.equipe.gerarLink(pessoa);
    assert.match(link, /\/gestao\/definir-senha\?token=/);
    const achada = await acesso.equipe.pessoaDoToken(bancoCom(pessoa), tokenDo(link));
    assert.equal(achada.id, 7);
    assert.match(bancoCom.ultimoSql, /FROM funcionarios/);
  });

  test('deixa de valer depois que a senha muda (uso único)', async () => {
    const token = tokenDo(acesso.equipe.gerarLink(pessoa));
    await assert.rejects(
      acesso.equipe.pessoaDoToken(bancoCom({ ...pessoa, senha: 'hash-novo' }), token),
      (erro) => erro.status === 410
    );
  });

  test('link de cliente não troca senha da equipe (e vice-versa)', async () => {
    const tokenCliente = require('jsonwebtoken').sign(
      { id: 7, tipo: 'definir_senha', fp: 'x' }, process.env.JWT_SECRET, { expiresIn: '1h' }
    );
    await assert.rejects(acesso.equipe.pessoaDoToken(bancoCom(pessoa), tokenCliente), (erro) => erro.status === 400);
    const tokenEquipe = tokenDo(acesso.equipe.gerarLink(pessoa));
    await assert.rejects(acesso.clienteDoToken(bancoCom(pessoa), tokenEquipe), (erro) => erro.status === 400);
  });
});
