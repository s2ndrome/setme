import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'gh-pages' ? '/setme/' : '/',
  build: {
    outDir: 'dist'
  }
}));
