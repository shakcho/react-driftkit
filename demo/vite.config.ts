import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = new URL('.', import.meta.url).pathname;

/**
 * Serves the canonical `llms.txt` from the repo root in dev, and emits
 * it into `demo-dist/` on build. The documented version line is rewritten
 * on the fly from `package.json#version` so the deployed file always
 * reflects the published version without manual edits.
 */
function llmsTxtPlugin(): Plugin {
  const source = resolve(__dirname, '../llms.txt');
  const pkgPath = resolve(__dirname, '../package.json');

  const getLatest = (): string | null => {
    if (!existsSync(source)) return null;
    const raw = readFileSync(source, 'utf8');
    if (!existsSync(pkgPath)) return raw;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
      if (!pkg.version) return raw;
      // Rewrite the documented-version line to match package.json.
      return raw.replace(
        /(Current documented version:\s*`)[^`]+(`)/,
        `$1${pkg.version}$2`,
      );
    } catch {
      return raw;
    }
  };

  return {
    name: 'react-driftkit-llms-txt',
    configureServer(server) {
      server.middlewares.use('/llms.txt', (_req, res, next) => {
        const body = getLatest();
        if (body === null) return next();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(body);
      });
    },
    closeBundle() {
      const body = getLatest();
      if (body === null) return;
      writeFileSync(resolve(__dirname, '../demo-dist/llms.txt'), body, 'utf8');
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
