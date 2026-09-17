import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // A porta padrão continua 5174 — é a que está nas Redirect URLs do
    // Supabase e a que o time usa. Mas quando `PORT` vem do ambiente ela ganha:
    // com `strictPort` fixo, o dev server morria se qualquer outro projeto já
    // estivesse em 5174, em vez de simplesmente subir ao lado.
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
  },
});
