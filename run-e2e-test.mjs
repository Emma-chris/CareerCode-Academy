import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');

function httpGet(host, port, pathname = '/') {
  return new Promise((resolve) => {
    const options = { hostname: host, port, path: pathname, method: 'GET', timeout: 2000 };
    const request = http.get(options, (res) => {
      res.resume();
      resolve(true);
    });
    request.on('error', (err) => {
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
  });
}

async function waitForServer(host, port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await httpGet(host, port);
      if (result) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server ${host}:${port} not ready after ${timeoutMs}ms`);
}

function log(label, data) {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (line) console.log(`[${label}] ${line}`);
  }
}

// Kill any process currently listening on the given ports (stale dev servers
// from a previous interrupted run would otherwise get hit instead of ours).
function freePorts(...ports) {
  for (const port of ports) {
    try {
      execSync(
        `powershell -NoProfile -NonInteractive -Command "$ids = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($ids) { foreach ($id in $ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: 'ignore', timeout: 10000 }
      );
    } catch {}
  }
}

async function main() {
  console.log('═══ E2E Test Runner ═══\n');

  const PROJECT = process.env.E2E_PROJECT || process.argv[2] || 'admin-calendar';
  console.log(`Project: ${PROJECT}`);

  freePorts(3000, 5000);

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const backend = spawn('npx.cmd', ['tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      FRONTEND_URL,
      // e2e runs against a dev-only backend; localhost must be CORS-allowed
      CORS_ORIGINS: process.env.CORS_ORIGINS || `${FRONTEND_URL},http://127.0.0.1:3000`,
      // JWT secrets are required by the auth flow and missing from backend/.env
      JWT_SECRET: process.env.JWT_SECRET || 'e2e-dev-jwt-secret-0123456789abcdef0123456789',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'e2e-dev-refresh-secret-0123456789abcdef012345',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  });
  backend.stdout.on('data', d => log('backend', d));
  backend.stderr.on('data', d => log('backend-err', d));

  const frontend = spawn('npx.cmd', ['vite', '--host', '--port', '3000'], {
    cwd: FRONTEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  frontend.stdout.on('data', d => log('frontend', d));
  frontend.stderr.on('data', d => log('frontend-err', d));

  let exitCode = 0;

  try {
    console.log('Waiting for backend...');
    await waitForServer('localhost', 5000, 40000);
    console.log('✓ Backend ready');

    console.log('Waiting for frontend...');
    await waitForServer('localhost', 3000, 30000);
    console.log('✓ Frontend ready');

    console.log('\nRunning Playwright tests...\n');
    const pw = spawn('npx.cmd', ['playwright', 'test', `--project=${PROJECT}`, '--reporter=list'], {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        BASE_URL: 'http://localhost:3000',
        API_URL: 'http://localhost:5000/api/v1',
      },
    });

    exitCode = await new Promise((resolve) => {
      pw.on('close', resolve);
      pw.on('error', () => resolve(1));
    });
  } catch (err) {
    console.error('Error:', err.message);
    exitCode = 1;
  } finally {
    console.log('\nCleanup...');
    backend.kill();
    frontend.kill();
    // Give processes time to cleanup
    await new Promise(r => setTimeout(r, 2000));
    freePorts(3000, 5000);
  }

  console.log(`\nExit code: ${exitCode}`);
  process.exit(exitCode);
}

main();
