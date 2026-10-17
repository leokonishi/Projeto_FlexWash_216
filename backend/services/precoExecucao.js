const { ErroNegocio } = require('./erros');

// Os preços ficam em centavos (inteiros) durante a conta, para não acumular erro de ponto flutuante.

// 'Pequeno' | 'Médio' | 'Grande' (enum de veiculos.porte) -> 'pequeno' | 'medio' | 'grande'
function normalizarPorte(porte) {
  const p = String(porte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

  if (p === 'pequeno' || p === 'pequena') return 'pequeno';
  if (p === 'medio' || p === 'media') return 'medio';
  if (p === 'grande') return 'grande';
  return null;
}

// Preço do pacote/extra para o porte, em centavos. Lê preco_pequeno / preco_medio / preco_grande.
function precoEmCentavos(item, porte) {
  const chave = normalizarPorte(porte);
  if (!chave) {
    throw new ErroNegocio(`Porte de veículo desconhecido: "${porte}".`, 422);
  }

  const centavos = Math.round(Number(item[`preco_${chave}`]) * 100);
  if (!Number.isFinite(centavos) || centavos < 0) {
    throw new ErroNegocio(`Preço inválido cadastrado para "${item.nome ?? item.id}" (porte ${chave}).`, 422);
  }
  return centavos;
}

// pacote pode ser null (entrada só com extras); extras é uma lista (possivelmente vazia)
function calcularValorCentavos({ porte, pacote, extras }) {
  let total = 0;
  if (pacote) total += precoEmCentavos(pacote, porte);
  for (const extra of extras) total += precoEmCentavos(extra, porte);
  return total;
}

// 12345 -> '123.45' (formato aceito pelo DECIMAL(10,2) do MySQL)
function centavosParaDecimal(centavos) {
  return (centavos / 100).toFixed(2);
}

module.exports = { normalizarPorte, precoEmCentavos, calcularValorCentavos, centavosParaDecimal };
