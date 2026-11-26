// Carro de um agendamento que chega antes do horário marcado (até em outro dia):
// a entrada no pátio é aceita e o serviço passa a ser de agora, liberando o horário.
const { test, describe, before, after } = require('node:test');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-32-caracteres!!';
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');
const agenda = require('../services/agenda');

const executados = [];
let quando = null;
const conexaoFalsa = {
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  execute: async (sql, params = []) => {
    executados.push({ sql, params });
    if (/SELECT status, veiculo_id, agendamento_id/.test(sql)) {
      return [[{ status: 'Agendado', veiculo_id: 5, agendamento_id: null, quando }]];
    }
    if (/^\s*UPDATE execucoes SET status/.test(sql)) return [{ affectedRows: 1 }];
    return [[]];
  },
};
const bancoFalso = { getConnection: async () => conexaoFalsa, execute: conexaoFalsa.execute, query: async () => [[]] };
require.cache[path.resolve(__dirname, '../bd.js')] = { id: 'bd', filename: 'bd', loaded: true, exports: bancoFalso };

let servidor;
let base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.usuarioLogado = { id: 1, perfil: 'funcionario', nome: 'Teste' }; next(); });
  app.use('/api', require('../routes/execucoesRoutes'));
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => servidor?.close());

async function carroChegou() {
  executados.length = 0;
  const res = await fetch(`${base}/execucoes/7/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novoStatus: 'Aguardando' }),
  });
  const update = executados.find((e) => /^\s*UPDATE execucoes SET status/.test(e.sql));
  return { res, update };
}

describe('Carro chegou antes do horário', () => {
  test('agendamento de outro dia entra no pátio e passa para agora', async () => {
    const agora = agenda.agoraLocal();
    quando = `${agenda.somarDias(agora.data, 2)} 10:00`;
    const { res, update } = await carroChegou();
    assert.equal(res.status, 200);
    assert.match(update.sql, /data_agendamento = \?/);
    assert.match(update.params[1], new RegExp(`^${agora.data} \\d{2}:\\d{2}:00$`));
  });

  test('horário que já passou fica como estava', async () => {
    quando = `${agenda.somarDias(agenda.agoraLocal().data, -1)} 10:00`;
    const { res, update } = await carroChegou();
    assert.equal(res.status, 200);
    assert.doesNotMatch(update.sql, /data_agendamento/);
  });
});
