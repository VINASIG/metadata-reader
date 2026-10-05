import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://metadata.vinasig.io.vn',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'never' },
});
