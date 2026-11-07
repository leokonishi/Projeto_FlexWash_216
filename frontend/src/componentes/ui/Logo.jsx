import { useId } from 'react';

// Símbolo do FlexWash: gota (azul -> verde) com uma onda, sobre um selo escuro,
// com um brilho dourado no canto.
export function LogoSimbolo({ className = 'size-10' }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a347d" />
          <stop offset="1" stopColor="#0a0f1c" />
        </linearGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#5998fd" />
          <stop offset="1" stopColor="#10b985" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-f)`} />
      <path d="M20 7.5C17.6 10.6 11 17.7 11 23.6a9 9 0 0 0 18 0C29 17.7 22.4 10.6 20 7.5Z" fill={`url(#${id}-g)`} />
      <path d="M14.6 25.2c1.8-2.4 3.6-2.4 5.4 0s3.6 2.4 5.4 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M31 5.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#ecc655" />
    </svg>
  );
}

// Logo completa. `claro` = para fundos escuros.
export default function Logo({ claro = false, tamanho = 'md', className = '' }) {
  const simbolo = { sm: 'size-8', md: 'size-10', lg: 'size-12' }[tamanho];
  const texto = { sm: 'text-lg', md: 'text-xl', lg: 'text-[26px]' }[tamanho];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoSimbolo className={simbolo} />
      <span className={`font-display font-extrabold tracking-tight ${texto} ${claro ? 'text-white' : 'text-tinta-950'}`}>
        Flex<span className={claro ? 'text-marca-300' : 'text-marca-600'}>Wash</span>
      </span>
    </span>
  );
}
