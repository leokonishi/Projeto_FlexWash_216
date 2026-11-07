// frontend/src/utils/mascaras.js

export const aplicarMascaraCPF = (valor) => {
  if (!valor) return '';
  let v = valor.replace(/\D/g, ''); // Remove tudo o que não é dígito
  if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
};

export const aplicarMascaraTelefone = (valor) => {
  if (!valor) return '';
  let v = valor.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2'); // Coloca parênteses no DDD
  v = v.replace(/(\d)(\d{4})$/, '$1-$2');    // Coloca hífen no número
  return v;
};

export const aplicarMascaraPlaca = (valor) => {
  if (!valor) return '';
  // Formata para maiúsculas e remove caracteres especiais, limitando a 7 caracteres (Padrão e Mercosul)
  let v = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length > 7) v = v.slice(0, 7);
  return v;
};

// E-mail: sem espaços, minúsculo, só caracteres válidos e um único "@"
export const aplicarMascaraEmail = (valor) => {
  if (!valor) return '';
  let v = valor.toLowerCase().replace(/[^a-z0-9@._+-]/g, '');
  const arroba = v.indexOf('@');
  if (arroba !== -1) {
    v = v.slice(0, arroba + 1) + v.slice(arroba + 1).replace(/@/g, '');
  }
  return v.slice(0, 150);
};

// ---------- Validações (usar no envio do formulário) ----------

// CPF com os dois dígitos verificadores corretos
export const cpfValido = (valor) => {
  const v = String(valor || '').replace(/\D/g, '');
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(v.slice(0, 9)) === Number(v[9]) && digito(v.slice(0, 10)) === Number(v[10]);
};

// Telefone com DDD: fixo (10 dígitos) ou celular (11 dígitos, começando com 9)
export const telefoneValido = (valor) => {
  const v = String(valor || '').replace(/\D/g, '');
  if (v.length === 10) return true;
  return v.length === 11 && v[2] === '9';
};

export const emailValido = (valor) => /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(String(valor || ''));

// Confere CPF, telefone e e-mail de uma vez. Campos opcionais vazios passam.
// Retorna a primeira mensagem de erro ou null.
export const validarContato = ({ cpf, telefone, email }, { telefoneObrigatorio = false, emailObrigatorio = false, validarCpf = true } = {}) => {
  if (validarCpf && cpf !== undefined && !cpfValido(cpf)) return 'CPF inválido. Confira os 11 números.';
  if ((telefoneObrigatorio || telefone) && !telefoneValido(telefone)) return 'Telefone inválido. Use DDD + número, ex.: (11) 99999-9999.';
  if ((emailObrigatorio || email) && !emailValido(email)) return 'E-mail inválido. Ex.: nome@gmail.com';
  return null;
};
