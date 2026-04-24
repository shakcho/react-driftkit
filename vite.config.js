import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Library build only. The demo app is served by Astro (`npm run dev`) and
// built by `npm run build:demo`.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        MovableLauncher: resolve(__dirname, 'src/MovableLauncher.tsx'),
        SnapDock: resolve(__dirname, 'src/SnapDock.tsx'),
        DraggableSheet: resolve(__dirname, 'src/DraggableSheet.tsx'),
        ResizableSplitPane: resolve(__dirname, 'src/ResizableSplitPane.tsx'),
        InspectorBubble: resolve(__dirname, 'src/InspectorBubble.tsx'),
        ZoomLens: resolve(__dirname, 'src/ZoomLens.tsx'),
        FlickDeck: resolve(__dirname, 'src/FlickDeck.tsx'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        exports: 'named',
      },
    },
  },
});
