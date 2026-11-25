import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Política de segurança de conteúdo (CSP) do site publicado: só roda script do próprio site.
// Se alguém conseguir injetar um <script> (ex.: num nome de cliente), o navegador não executa,
// e o token guardado no localStorage não vaza. Só vale no build: o modo dev do Vite usa
// scripts inline e quebraria.
// - connect-src https: → API, Tabela FIPE, ViaCEP e os mapas (todos em HTTPS)
// - style-src 'unsafe-inline' → estilos inline do React e do mapa
function cspNoBuild(apiUrl) {
  let origemApi = '';
  try { origemApi = new URL(apiUrl).origin } catch { /* sem VITE_API_URL */ }
  const politica = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https: ${origemApi}`.trim(),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'flexwash-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politica }, injectTo: 'head-prepend' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), cspNoBuild(env.VITE_API_URL || 'http://localhost:8080')],
  }
})
