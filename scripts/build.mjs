// Production build: bundles src/ with esbuild, copies public/, writes dist/index.html.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { root, loadPublicEnv, envDefines, copyDir, rmDir, renderHtml } from './lib.mjs';

const dist = path.join(root, 'dist');
const env = loadPublicEnv();

rmDir(dist);
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: { main: 'src/main.jsx' },
  outdir: 'dist/assets',
  entryNames: '[name]-[hash]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'media/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'info',
  // Files in /public are copied as-is and referenced by absolute URL (fonts, images, model, Draco decoder).
  external: ['/fonts/*', '/images/*', '/models/*', '/draco/*'],
  define: {
    'process.env.NODE_ENV': '"production"',
    ...envDefines(env),
  },
});

copyDir(path.join(root, 'public'), dist);

// Locate the hashed entry + its CSS in the metafile.
const outputs = result.metafile.outputs;
const entryKey = Object.keys(outputs).find((k) => outputs[k].entryPoint === 'src/main.jsx');
if (!entryKey) throw new Error('Could not find the main entry in the esbuild metafile.');
const toUrl = (p) => '/' + path.relative(dist, path.join(root, p)).split(path.sep).join('/');
const scripts = [toUrl(entryKey)];
const styles = outputs[entryKey].cssBundle ? [toUrl(outputs[entryKey].cssBundle)] : [];
// Static (non-dynamic) imports of the entry are preloaded.
const preloads = (outputs[entryKey].imports || []).filter((i) => i.kind === 'import-statement' && !i.external).map((i) => toUrl(i.path));

fs.writeFileSync(path.join(dist, 'index.html'), renderHtml({ styles, scripts, preloads, env }));

// Report
const kb = (n) => (n / 1024).toFixed(1) + ' kB';
const rows = Object.entries(outputs)
  .filter(([k]) => k.endsWith('.js') || k.endsWith('.css'))
  .map(([k, v]) => `  ${path.relative(dist, path.join(root, k)).padEnd(44)} ${kb(v.bytes)}`);
console.log('\nLIVORA build complete → dist/\n' + rows.join('\n'));
