// Regras das rotas de equipe com um banco falso (sem MySQL):
// - funcionário não recebe CPF, e-mail e telefone dos colegas;
// - serviço finalizado não pode ser apagado.
const { test, describe, before, after } = require('node:test');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-32-caracteres!!';
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');

// Banco falso: responde conforme o SQL e guarda o que foi executado
const executados = [];
let respostaExecucao = null;
const bancoFalso = {
  execute: async (sql) => {
    executados.push(sql);
    if (/FROM funcionarios/.test(sql)) {
      return [[{ id: 3, nome: 'Bia Lima', cpf: '123.456.789-09', email: 'bia@x.com', telefone: '(11) 99999-0000', funcoes: 'Lavagem, Polimento', perfil: 'funcionario', ativo: 1 }]];
    }
    if (/FROM execucoes e JOIN clientes/.test(sql)) return [[respostaExecucao].filter(Boolean)];
    return [[]];
  },
  query: async () => [[]],
};
require.cache[path.resolve(__dirname, '../bd.js')] = { id: 'bd', filename: 'bd', loaded: true, exports: bancoFalso };

let servidor;
let base;
let perfil = 'funcionario';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.usuarioLogado = { id: 1, perfil, nome: 'Teste' }; next(); });
  app.use('/api', require('../endpoints/funcionarios'));
  app.use('/api', require('../routes/execucoesRoutes'));
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => servidor?.close());

describe('Lista da equipe', () => {
  test('funcionário recebe só nome e funções dos colegas', async () => {
    perfil = 'funcionario';
    const { dados } = await (await fetch(`${base}/funcionarios`)).json();
    assert.deepEqual(Object.keys(dados[0]).sort(), ['ativo', 'funcoes', 'id', 'nome', 'perfil']);
    assert.deepEqual(dados[0].funcoes, ['Lavagem', 'Polimento']);
  });

  test('administrador recebe os dados completos', async () => {
    perfil = 'administrador';
    const { dados } = await (await fetch(`${base}/funcionarios`)).json();
    assert.equal(dados[0].cpf, '123.456.789-09');
    assert.equal(dados[0].email, 'bia@x.com');
  });
});

describe('Excluir serviço', () => {
  test('finalizado não é apagado', async () => {
    perfil = 'administrador';
    respostaExecucao = { agendamento_id: null, status: 'Finalizado', valor_total: 50, cliente_nome: 'Ana', placa: 'ABC1D23' };
    executados.length = 0;
    const res = await fetch(`${base}/execucoes/9`, { method: 'DELETE' });
    assert.equal(res.status, 409);
    assert.match((await res.json()).erro, /Reabrir/);
    assert.ok(!executados.some((sql) => /DELETE FROM execucoes/.test(sql)));
  });

  test('serviço ainda no pátio é apagado', async () => {
    respostaExecucao = { agendamento_id: null, status: 'Aguardando', valor_total: 50, cliente_nome: 'Ana', placa: 'ABC1D23' };
    executados.length = 0;
    const res = await fetch(`${base}/execucoes/9`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    assert.ok(executados.some((sql) => /DELETE FROM execucoes/.test(sql)));
  });
});
