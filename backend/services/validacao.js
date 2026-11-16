// Validação dos dados de pessoas (clientes e funcionários) no backend.
// A tela já valida, mas quem chama a API direto também precisa ser barrado.
// Cada função devolve o valor já no formato gravado no banco, ou lança ErroNegocio.
const { ErroNegocio } = require('./erros');

const digitos = (v) => String(v ?? '').replace(/\D/g, '');

// CPF com os dois dígitos verificadores. Gravado como 000.000.000-00.
function cpf(valor) {
  const v = digitos(valor);
  const valido = v.length === 11 && !/^(\d)\1{10}$/.test(v) && [9, 10].every((n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(v[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return (resto === 10 ? 0 : resto) === Number(v[n]);
  });
  if (!valido) throw new ErroNegocio('CPF inválido. Confira os 11 números.');
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Telefone com DDD: fixo (10 dígitos) ou celular (11, começando com 9). Gravado como (11) 99999-9999.
function telefone(valor) {
  const v = digitos(valor);
  if (v.length === 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  if (v.length === 11 && v[2] === '9') return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  throw new ErroNegocio('Telefone inválido. Use DDD + número, ex.: (11) 99999-9999.');
}

// E-mail em minúsculas. Vazio vira null quando é opcional.
function email(valor, { obrigatorio = false } = {}) {
  const v = String(valor ?? '').trim().toLowerCase();
  if (!v) {
    if (obrigatorio) throw new ErroNegocio('Informe o e-mail.');
    return null;
  }
  if (v.length > 150 || !/^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v)) {
    throw new ErroNegocio('E-mail inválido. Ex.: nome@gmail.com');
  }
  return v;
}

function nome(valor) {
  const v = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (v.length < 2) throw new ErroNegocio('Informe o nome.');
  if (v.length > 100) throw new ErroNegocio('O nome pode ter no máximo 100 caracteres.');
  return v;
}

// Senha: mínimo 8 caracteres, com pelo menos uma letra e um número.
const SENHA_MINIMA = 8;
const REGRA_SENHA = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres, com letras e números.`;
function senha(valor) {
  const v = typeof valor === 'string' ? valor : '';
  if (v.length < SENHA_MINIMA || v.length > 72 || !/[a-z]/i.test(v) || !/\d/.test(v)) {
    throw new ErroNegocio(REGRA_SENHA);
  }
  return v;
}

// Na edição, um CPF antigo (de antes da validação) que não mudou continua aceito.
function cpfNaEdicao(valor, cpfAtual) {
  if (cpfAtual && digitos(valor) === digitos(cpfAtual)) return cpfAtual;
  return cpf(valor);
}

module.exports = { cpf, cpfNaEdicao, telefone, email, nome, senha, REGRA_SENHA, SENHA_MINIMA };
