import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const mode = process.argv[2];
if (!['web', 'api', 'worker', 'all'].includes(mode)) {
  console.error('Usage: node scripts/dev.mjs web|api|worker|all');
  process.exit(1);
}

if (existsSync('.env')) process.loadEnvFile('.env');

const env = { ...process.env };
env.API_INTERNAL_URL ??= `http://127.0.0.1:${env.PORT ?? '3001'}`;
env.DATABASE_URL ??= `postgresql://${encodeURIComponent(env.POSTGRES_USER ?? 'rumbo')}:${encodeURIComponent(env.POSTGRES_PASSWORD ?? 'rumbo')}@127.0.0.1:${env.POSTGRES_PORT ?? '5433'}/${env.POSTGRES_DB ?? 'rumbo'}`;

const children = new Set();
const executable = (name) => (process.platform === 'win32' && name === 'pnpm' ? 'pnpm.cmd' : name);

function run(name, args, { watch = false } = {}) {
  const child = spawn(executable(name), args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  if (watch) {
    child.once('exit', (code) => {
      if (!stopping) stop(code ?? 1);
    });
  }
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} ${args.join(' ')} exited with ${code}`));
    });
  });
}

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

/** Long-running processes: one exiting stops the rest, so a crash never leaves half a stack. */
function watch(name, args) {
  void run(name, args, { watch: true }).catch((error) => {
    if (!stopping) console.error(error);
  });
}

/** Postgres from compose, shared packages and migrations: what api and worker both need. */
async function backend() {
  await run('docker', ['compose', 'up', '-d', '--wait', 'postgres']);
  await run('pnpm', ['build:packages']);
  await run('pnpm', ['db:migrate']);
}

/** A Node app (api, worker): build once, then recompile and restart it as its source changes. */
async function nodeApp(app) {
  await run('pnpm', ['--filter', `@rumbo/${app}`, 'build']);
  watch('pnpm', [
    '--filter',
    `@rumbo/${app}`,
    'exec',
    'tsc',
    '-p',
    'tsconfig.build.json',
    '--watch',
    '--preserveWatchOutput',
  ]);
  watch('node', ['--watch', '--enable-source-maps', `apps/${app}/dist/main.js`]);
}

try {
  if (mode === 'web' || mode === 'all') watch('pnpm', ['--filter', '@rumbo/web', 'dev']);
  if (mode !== 'web') {
    await backend();
    if (mode === 'api' || mode === 'all') await nodeApp('api');
    if (mode === 'worker' || mode === 'all') await nodeApp('worker');
  }
} catch (error) {
  console.error(error);
  stop(1);
}
