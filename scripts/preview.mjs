// Serves the production build in dist/ (run `npm run build` first).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { root, serveStatic } from './lib.mjs';

const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}
const port = Number(process.env.PORT || 4173);
http.createServer(serveStatic(dist)).listen(port, () => console.log(`LIVORA preview → http://localhost:${port}`));
