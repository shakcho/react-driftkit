import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

const __dirname = new URL('.', import.meta.url).pathname;

/**
 * Copies the canonical `llms.txt` from the repo root into both the dev
 * serve output and the built `demo-dist/` so agents can fetch it from
 * `/llms.txt` on the deployed demo site without duplicating the file.
 */
function llmsTxtPlugin(): Plugin {
  const source = resolve(__dirname, '../llms.txt');
  return {
    name: 'react-driftkit-llms-txt',
    // Dev: serve /llms.txt from the repo root on request.
    configureServer(server) {
      server.middlewares.use('/llms.txt', (_req, res, next) => {
        if (!existsSync(source)) return next();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        import('fs').then(({ readFile }) => {
          readFile(source, 'utf8', (err, data) => {
            if (err) return next(err);
            res.end(data);
          });
        });
      });
    },
    // Build: emit the file into outDir so it ships with demo-dist/.
    closeBundle() {
      if (!existsSync(source)) return;
      copyFileSync(source, resolve(__dirname, '../demo-dist/llms.txt'));
    },
  };
}

export default defineConfig({
  plugins: [react(), llmsTxtPlugin()],
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, '../demo-dist'),
    emptyOutDir: true,
  },
});
