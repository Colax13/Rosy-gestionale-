// Configurazione della sola anteprima: le stesse pagine del programma, ma con
// i dati finti al posto di Firestore. Non tocca la compilazione vera.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'anteprima'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/lib\/api-client$/, replacement: path.resolve(__dirname, 'anteprima/finto-api-client.ts') },
      { find: /^@\/lib\/accessi$/, replacement: path.resolve(__dirname, 'anteprima/finto-accessi.ts') },
      { find: '@', replacement: path.resolve(__dirname, 'salone-app/frontend') },
    ],
  },
  server: { port: 5199, hmr: false },
});
