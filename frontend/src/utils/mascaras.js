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