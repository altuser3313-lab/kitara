import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  { name: 'api', args: ['--watch', path.join(root, 'server', 'src', 'index.js')], cwd: path.join(root, 'server') },
  { name: 'web', args: [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev'], cwd: root }
];

const procs = targets.map(({ name, args, cwd }) => {
  const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (stream) => (data) =>
    stream.write(String(data).split('\n').filter(Boolean).map((line) => `[${name}] ${line}`).join('\n') + '\n');

  child.stdout.on('data', write(process.stdout));
  child.stderr.on('data', write(process.stderr));
  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code) => {
    console.log(`[${name}] exited with ${code}`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of procs) if (!child.killed) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
