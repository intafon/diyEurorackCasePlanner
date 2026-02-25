import { defineConfig } from 'vite';

export default defineConfig({
  base: '/diyEurorackCasePlanner/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  publicDir: 'public',
  server: {
    open: true,
  },
});
