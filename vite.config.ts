import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.wgsl'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@citron-bloom-engine': resolve(__dirname, 'engines/citron-bloom'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
