import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Validate the generated pages at the same repository subpath used by Pages.
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const base = (process.env.SITE_BASE_PATH || '').replace(/\/$/, '');
const pages = ['index.html', 'projects/faust-light-system/index.html',
  'apps/faust-light-lab/index.html', 'apps/faust-light-lab/Behavior_Review.html',
  'apps/faust-model-lab/index.html', 'apps/faust-model-lab/preview.html'];
let count = 0;
for (const page of pages) {
  const html = await readFile(path.join(root, page), 'utf8');
  const pageURL = new URL(`${base}/${page}`, 'http://portfolio.test');
  for (const match of html.matchAll(/\b(?:href|src|poster|data-app-src)="([^"]+)"/g)) {
    const url = new URL(match[1], pageURL);
    if (url.origin !== pageURL.origin || match[1].startsWith('#')) continue;
    if (base && !url.pathname.startsWith(`${base}/`)) throw Error(`Escapes deployment base: ${page} → ${match[1]}`);
    const relative = decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//, '');
    const destination = path.join(root, relative);
    const info = await stat(destination).catch(() => null);
    if (!info) throw Error(`Missing asset/link: ${page} → ${match[1]}`);
    if (info.isDirectory()) await stat(path.join(destination, 'index.html'));
    count++;
  }
}
console.log(`Verified ${count} local links/assets across ${pages.length} built pages at ${base || '/'}.`);
