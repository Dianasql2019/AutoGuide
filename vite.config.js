
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/AutoGuide/',
  server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true
    }
  }
},
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        catalog: resolve(process.cwd(), 'catalog.html'),
        instructor: resolve(process.cwd(), 'instructor.html'),
        register: resolve(process.cwd(), 'register.html'),
        login: resolve(process.cwd(), 'login.html'),
      }
    }
  }
});
