import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import {defineConfig} from 'vite';

function injectServiceWorkerAssets() {
  return {
    name: 'inject-training-os-precache',
    apply: 'build' as const,
    closeBundle() {
      const distDirectory = path.resolve(__dirname, 'dist');
      const serviceWorkerPath = path.join(distDirectory, 'sw.js');
      if (!fs.existsSync(serviceWorkerPath)) return;

      const collectFiles = (directory: string): string[] =>
        fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
          const absolute = path.join(directory, entry.name);
          return entry.isDirectory() ? collectFiles(absolute) : [absolute];
        });

      const assets = collectFiles(distDirectory)
        .filter((file) => file !== serviceWorkerPath)
        .map((file) => `./${path.relative(distDirectory, file).split(path.sep).join('/')}`);
      const source = fs.readFileSync(serviceWorkerPath, 'utf8');
      fs.writeFileSync(
        serviceWorkerPath,
        source.replace(
          '/* INJECT_BUILD_ASSETS */ []',
          `/* INJECT_BUILD_ASSETS */ ${JSON.stringify(assets)}`
        )
      );
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), injectServiceWorkerAssets()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
