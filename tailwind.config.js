/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        flex: {
          primary: '#2563EB',    // Azul principal (botões e destaques)
          azulescuro: '#0F172A',   // Azul escuro
          preto: '#1E293B',       // Tom escuro para fundos ou textos
          amarelo: '#F59E0B',    // Amareko para alertas
          branco: '#F8FAFC',      // Tom claro para fundo de telas
          sucesso: '#10B981',    // Verde para status de conclusão
          erro: '#EF4444',     // Vermelho para erros ou alertas
        }
      } ,
      fontFamily: {
        sans: ['Inter', 'sans-serif'], //Fonte padrão do projeto
      },
    },
  },
  plugins: [],
}