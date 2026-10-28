import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// VITE_BASE: percorso base del sito.
//  - dominio personalizzato o utente.github.io  -> "/"
//  - pagina di progetto (utente.github.io/nome-repo) -> "/nome-repo/"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
  };
});
