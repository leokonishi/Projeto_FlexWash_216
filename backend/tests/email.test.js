const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const email = require('../services/email');

const envOriginal = { ...process.env };
const fetchOriginal = global.fetch;
afterEach(() => {
  process.env = { ...envOriginal };
  global.fetch = fetchOriginal;
});

describe('E-mail', () => {
  test('separa nome e endereço do remetente', () => {
    assert.deepEqual(email.separarRemetente('Lava Flex <loja@gmail.com>'), { name: 'Lava Flex', email: 'loja@gmail.com' });
    assert.deepEqual(email.separarRemetente('"Lava Flex" <loja@gmail.com>'), { name: 'Lava Flex', email: 'loja@gmail.com' });
    assert.deepEqual(email.separarRemetente('loja@gmail.com'), { name: 'FlexWash', email: 'loja@gmail.com' });
  });

  test('com BREVO_API_KEY envia pela API HTTP (sem SMTP)', async () => {
    process.env.BREVO_API_KEY = 'chave-teste';
    process.env.EMAIL_REMETENTE = 'Loja <loja@gmail.com>';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    let chamada;
    global.fetch = async (url, opcoes) => { chamada = { url, opcoes }; return { ok: true }; };

    const r = await email.enviar({ para: 'cli@x.com', assunto: 'Oi', texto: 'texto', html: '<p>oi</p>' });
    assert.equal(r.enviado, true);
    assert.equal(chamada.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(chamada.opcoes.headers['api-key'], 'chave-teste');
    const corpo = JSON.parse(chamada.opcoes.body);
    assert.deepEqual(corpo.sender, { name: 'Loja', email: 'loja@gmail.com' });
    assert.deepEqual(corpo.to, [{ email: 'cli@x.com' }]);
  });

  test('erro da Brevo vira exceção com o status', async () => {
    process.env.BREVO_API_KEY = 'chave-teste';
    process.env.EMAIL_REMETENTE = 'loja@gmail.com';
    global.fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
    await assert.rejects(email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' }), /Brevo respondeu 401/);
  });

  test('sem configuração só registra no log', async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.SMTP_HOST;
    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });
    assert.deepEqual(r, { enviado: false, simulado: true });
  });
});
