import { spawn } from 'node:child_process';

function run(cmd, args = [], opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  p.on('exit', (code) => {
    if (code !== 0) console.error(`[${cmd}] exited with code ${code}`);
  });
  return p;
}

const backend = run('node', ['backend/server.js'], { cwd: process.cwd() });
const vite = run('vite', [], { cwd: process.cwd() });

function shutdown() {
  try { backend.kill('SIGINT'); } catch {}
  try { vite.kill('SIGINT'); } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
