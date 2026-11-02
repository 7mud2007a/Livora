// Shared helpers for the build, dev and preview scripts (no dependencies beyond Node itself).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

/** Minimal .env parser: KEY=value lines, optional quotes, # comments. */
function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

/** Only variables prefixed with PUBLIC_ are exposed to the browser bundle. */
export function loadPublicEnv() {
  const fromFiles = { ...parseEnvFile(path.join(root, '.env')), ...parseEnvFile(path.join(root, '.env.local')) };
  const merged = { ...fromFiles, ...process.env };
  const env = {
    PUBLIC_SITE_URL: '',
    PUBLIC_CONTACT_ENDPOINT: '',
  };
  for (const [k, v] of Object.entries(merged)) if (k.startsWith('PUBLIC_') && typeof v === 'string') env[k] = v;
  return env;
}

export function envDefines(env) {
  const defs = {};
  for (const [k, v] of Object.entries(env)) defs[`import.meta.env.${k}`] = JSON.stringify(v);
  return defs;
}

export function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Fill the index.html template. */
export function renderHtml({ styles = [], scripts = [], preloads = [], env, extraHead = '', extraBody = '' }) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const siteUrl = (env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const abs = (p) => (siteUrl ? `${siteUrl}${p}` : p);
  const styleTags = styles.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n    ');
  const preloadTags = preloads.map((href) => `<link rel="modulepreload" href="${href}" crossorigin />`).join('\n    ');
  const scriptTags = scripts.map((src) => `<script type="module" src="${src}"></script>`).join('\n    ');
  html = html
    .replaceAll('%OG_IMAGE%', abs('/og-image.jpg'))
    .replaceAll('%SITE_URL%', siteUrl ? siteUrl + '/' : '/')
    .replace(
      '<!--livora:canonical-->',
      siteUrl ? `<link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />` : ''
    )
    .replace('<!--livora:styles-->', styleTags + (preloadTags ? '\n    ' + preloadTags : '') + extraHead)
    .replace('<!--livora:scripts-->', scriptTags + extraBody);
  return html;
}

export function serveStatic(rootDir, { spaFallback = true } = {}) {
  return (req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      let file = path.join(rootDir, urlPath);
      if (!file.startsWith(rootDir)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        if (spaFallback && !path.extname(urlPath)) file = path.join(rootDir, 'index.html');
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
          return;
        }
      }
      const ext = path.extname(file).toLowerCase();
      const stat = fs.statSync(file);
      const etag = `W/"${stat.size.toString(16)}-${Math.round(stat.mtimeMs).toString(16)}"`;
      // Hashed bundles never change; fonts, images, the model and the decoder are cached for a week and revalidated
      // with an ETag; the HTML is always revalidated. (Mirror this on the real host: see README → Hosting notes.)
      const cache = /\/assets\//.test(urlPath)
        ? 'public, max-age=31536000, immutable'
        : /\/(fonts|images|models|draco)\//.test(urlPath)
          ? 'public, max-age=604800'
          : 'no-cache';
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: etag, 'Last-Modified': stat.mtime.toUTCString() };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers).end();
        return;
      }
      res.writeHead(200, { ...headers, 'Content-Length': stat.size });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  };
}
