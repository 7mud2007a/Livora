// Development server: esbuild watch + static server with live reload.
import fs from 'node:fs';
import path from 'node:path';
import { context } from 'esbuild';
import { root, loadPublicEnv, envDefines, copyDir, rmDir, renderHtml } from './lib.mjs';

const port = Number(process.env.PORT || 5173);
const env = loadPublicEnv();
const out = path.join(root, '.dev');

rmDir(out);
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
copyDir(path.join(root, 'public'), out);

const liveReload = `
    <script>new EventSource('/esbuild').addEventListener('change', () => location.reload());</script>`;
fs.writeFileSync(
  path.join(out, 'index.html'),
  renderHtml({ styles: ['/assets/main.css'], scripts: ['/assets/main.js'], env, extraBody: liveReload })
);

const ctx = await context({
  absWorkingDir: root,
  entryPoints: { main: 'src/main.jsx' },
  outdir: '.dev/assets',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  sourcemap: 'linked',
  logLevel: 'info',
  external: ['/fonts/*', '/images/*', '/models/*', '/draco/*'],
  define: { 'process.env.NODE_ENV': '"development"', ...envDefines(env) },
});

await ctx.watch();
const { hosts, port: actualPort } = await ctx.serve({ servedir: '.dev', port, fallback: '.dev/index.html' });
console.log(`\nLIVORA dev server → http://localhost:${actualPort}  (${hosts.join(', ')})\nEdit files in src/ — the page reloads automatically.`);
