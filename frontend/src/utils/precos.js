// Prévia de preço na tela. O valor que vale é sempre o calculado pelo backend
// (services/precoExecucao.js), que usa as mesmas regras.

// 'Pequeno' | 'Médio' | 'Grande' -> 'pequeno' | 'medio' | 'grande'
export function chavePorte(porte) {
  const p = String(porte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  if (p === 'pequeno' || p === 'pequena') return 'pequeno';
  if (p === 'grande') return 'grande';
  return 'medio';
}

// Preço de um pacote ou extra para o porte do veículo, em centavos
export function precoCentavos(item, porte) {
  if (!item) return 0;
  return Math.round(Number(item[`preco_${chavePorte(porte)}`] || 0) * 100);
}

export function formatarMoeda(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
