import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../integrations/faust-light-lab/', import.meta.url));
const outDir = fileURLToPath(new URL('../public/apps/faust-light-lab/', import.meta.url));
await build({ root, base: './', build: { outDir, emptyOutDir: true, target: 'es2022' } });
