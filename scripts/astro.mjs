// Keep the original telemetry preference while supporting Windows and Unix shells.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../node_modules/astro/astro.js', import.meta.url));
const action = process.argv[2] ?? 'dev';
const commands = action === 'build' ? [['check'], ['build']] : [[action, ...process.argv.slice(3)]];
for (const args of commands) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
