import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  // Dev mode: serve the demo app
  if (command === 'serve') {
    return {
      plugins: [react()],
      root: 'demo',
    };
  }

  // Build mode: library output
  return {
    plugins: [react()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ReactDrift',
        formats: ['es', 'cjs'],
        fileName: 'react-drift',
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
      },
    },
  };
});
