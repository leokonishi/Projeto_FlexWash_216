// Links do WhatsApp (wa.me). Abre o app no celular ou o WhatsApp Web no computador.

// Número da loja para o cliente falar com o lava-rápido: VITE_WHATSAPP_LOJA no Render
// (Static Site > Environment), com DDD, ex.: 11999998888. Sem ele, o botão não aparece.
export const WHATSAPP_LOJA = String(import.meta.env.VITE_WHATSAPP_LOJA || '').replace(/\D/g, '');

// Telefone brasileiro (com ou sem máscara) -> link com mensagem pronta. null se o número não serve.
export function linkWhatsApp(telefone, mensagem = '') {
  let digitos = String(telefone || '').replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 13) return null;
  return `https://wa.me/${digitos}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
