
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/AutoGuide/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        catalog: resolve(process.cwd(), 'catalog.html'),
        instructor: resolve(process.cwd(), 'instructor.html')
      }
    }
  }
});
