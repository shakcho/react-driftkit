import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://react-driftkit.saktichourasia.dev';

/**
 * Mirrors the legacy Vite plugin: serves the canonical root `llms.txt` in dev,
 * and emits it (with the documented-version line rewritten to match
 * package.json#version) into the build output at close time.
 */
function llmsTxtIntegration() {
  const source = resolve(__dirname, '../llms.txt');
  const pkgPath = resolve(__dirname, '../package.json');

  const read = () => {
    if (!existsSync(source)) return null;
    const raw = readFileSync(source, 'utf8');
    if (!existsSync(pkgPath)) return raw;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (!pkg.version) return raw;
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
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/llms.txt', (_req, res, next) => {
          const body = read();
          if (body === null) return next();
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(body);
        });
      },
      'astro:build:done': ({ dir }) => {
        const body = read();
        if (body === null) return;
        writeFileSync(resolve(fileURLToPath(dir), 'llms.txt'), body, 'utf8');
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  root: __dirname,
  outDir: resolve(__dirname, '../demo-dist'),
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [react(), sitemap(), llmsTxtIntegration()],
  vite: {
    resolve: {
      alias: {
        'react-driftkit': resolve(__dirname, '../src/index.ts'),
      },
    },
  },
});
