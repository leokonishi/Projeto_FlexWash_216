// Endereço com CEP (ViaCEP), usado no cadastro do cliente, no agendamento e na
// tela do gerente. O endereço é guardado no banco como um texto único neste formato:
//   "Rua X, 123, Apto 4 - Centro, Osasco - SP, 06010-000"
// O backend (services/mapa.js) separa esse texto de novo para achar o ponto no mapa.

const VIACEP_URL = 'https://viacep.com.br/ws';

export const ENDERECO_VAZIO = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
export const CAMPOS_OBRIGATORIOS = ['cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'];

export const soDigitos = (v) => String(v || '').replace(/\D/g, '');
export const mascaraCep = (v) => soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

export function enderecoCompleto(e) {
  return CAMPOS_OBRIGATORIOS.every((c) => String(e?.[c] || '').trim()) && soDigitos(e.cep).length === 8;
}

export function enderecoVazio(e) {
  return Object.values(e || {}).every((v) => !String(v || '').trim());
}

// Partes -> texto salvo no banco
export function montarEndereco(e) {
  const linha1 = [e.rua, e.numero, e.complemento].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
  return `${linha1} - ${e.bairro.trim()}, ${e.cidade.trim()} - ${e.uf.trim().toUpperCase()}, ${mascaraCep(e.cep)}`;
}

// Texto salvo -> partes. Devolve null se o texto não estiver nesse formato (endereço antigo).
export function separarEndereco(texto) {
  const m = String(texto || '').match(/^(.+?), ([^,]+?)(?:, (.+?))? - (.+?), (.+?) - ([A-Za-z]{2}), (\d{5}-?\d{3})$/);
  if (!m) return null;
  return { rua: m[1], numero: m[2], complemento: m[3] || '', bairro: m[4], cidade: m[5], uf: m[6].toUpperCase(), cep: mascaraCep(m[7]) };
}

// Partes no formato que o backend espera em `endereco_partes`
export function partesParaApi(e) {
  return { cep: soDigitos(e.cep), rua: e.rua, numero: e.numero, complemento: e.complemento || '', bairro: e.bairro, cidade: e.cidade, uf: e.uf };
}

// Consulta o ViaCEP. Devolve { rua, bairro, cidade, uf } ou lança Error com a mensagem para a tela.
export async function buscarCep(cep) {
  const digitos = soDigitos(cep);
  if (digitos.length !== 8) throw new Error('O CEP precisa ter 8 dígitos.');
  let dados;
  try {
    const res = await fetch(`${VIACEP_URL}/${digitos}/json/`);
    dados = await res.json();
    if (!res.ok) throw new Error();
  } catch {
    throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço à mão.');
  }
  if (dados.erro) throw new Error('CEP não encontrado. Confira os números ou preencha o endereço à mão.');
  return { rua: dados.logradouro || '', bairro: dados.bairro || '', cidade: dados.localidade || '', uf: dados.uf || '' };
}
