// Apoio dos testes: confere que a função barra a entrada com um ErroNegocio
// (o erro "esperado" que a rota transforma em resposta para o usuário).
const assert = require('node:assert/strict');
const { ErroNegocio } = require('../services/erros');

function barra(fn, { status = 400, mensagem } = {}) {
  assert.throws(fn, (erro) => {
    assert.ok(erro instanceof ErroNegocio, `esperava ErroNegocio, veio: ${erro}`);
    assert.equal(erro.status, status);
    if (mensagem) assert.match(erro.message, mensagem);
    return true;
  });
}

module.exports = { barra };
