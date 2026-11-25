import React from 'react';
import { MessageCircle } from 'lucide-react';
import { linkWhatsApp } from '../../utils/whatsapp';

// Botão que abre a conversa no WhatsApp com uma mensagem pronta.
// compacto: só o ícone (listas); senão, ícone + texto.
export default function BotaoWhatsApp({ telefone, mensagem, texto = 'WhatsApp', compacto = false, className = '' }) {
  const link = linkWhatsApp(telefone, mensagem);
  if (!link) return null;
  const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/10';
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={`Conversar no WhatsApp${telefone ? ` (${telefone})` : ''}`}
      aria-label={`Conversar no WhatsApp${telefone ? ` (${telefone})` : ''}`}
      className={`${base} ${compacto ? 'size-8' : 'h-9 px-2.5 text-sm'} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle size={compacto ? 16 : 17} />
      {!compacto && <span>{texto}</span>}
    </a>
  );
}
