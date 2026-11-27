
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, execSync } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import http from 'http';

function runCommandAsync(command: string, args: string[], cwd: string, timeoutMs = 120000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}: ${command}`));
      }
    });
  });
}

function isGoToolchainComplete(goDir: string): boolean {
  const goExecutable = path.join(goDir, 'bin', process.platform === 'win32' ? 'go.exe' : 'go');
  const runtimeSrc = path.join(goDir, 'src', 'runtime');
  const pkgTool = path.join(goDir, 'pkg', 'tool');
  return fs.existsSync(goExecutable) && fs.existsSync(runtimeSrc) && fs.existsSync(pkgTool);
}

async function ensureGoInstalled(): Promise<string | null> {
  // 1. Check if 'go' exists in system PATH
  try {
    execSync('go version', { stdio: 'ignore' });
    return 'go';
  } catch {
    // not in PATH
  }

  // 2. Check local downloaded binary and verify completeness
  const goDir = path.join(process.cwd(), 'go');
  const goExecutable = path.join(goDir, 'bin', 'go');
  if (isGoToolchainComplete(goDir)) {
    return goExecutable;
  }

  // Remove partial/corrupted go directory or leftover staging directory
  const tmpExtractDir = path.join(process.cwd(), '.go-download-tmp');
  try {
    if (fs.existsSync(goDir)) {
      console.warn('Incomplete local Go toolchain detected. Cleaning up before re-download...');
      fs.rmSync(goDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tmpExtractDir)) {
      fs.rmSync(tmpExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpExtractDir, { recursive: true });
  } catch (cleanupErr: any) {
    console.warn('Could not clean partial Go directories:', cleanupErr?.message || cleanupErr);
  }

  console.log('Go not found in system PATH. Downloading Go 1.22.2 asynchronously...');
  try {
    await runCommandAsync(
      'sh',
      ['-c', `curl -fsSL https://go.dev/dl/go1.22.2.linux-amd64.tar.gz | tar -xz -C "${tmpExtractDir}"`],
      process.cwd(),
      120000
    );
    const extractedGoDir = path.join(tmpExtractDir, 'go');
    if (isGoToolchainComplete(extractedGoDir)) {
      fs.renameSync(extractedGoDir, goDir);
      fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      console.log('Go downloaded and verified successfully.');
      return goExecutable;
    }
    console.warn('Downloaded Go archive appears incomplete.');
    fs.rmSync(tmpExtractDir, { recursive: true, force: true });
  } catch (err: any) {
    console.warn('Could not auto-download Go runtime:', err?.message || err);
    try {
      if (fs.existsSync(tmpExtractDir)) {
        fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function waitForGoBackend(url: string, timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve(true);
          } else {
            resolve(true);
          }
        });
        req.on('error', reject);
        req.setTimeout(500, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return false;
}

function cleanStaleGoProcesses() {
  try {
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM "gridscan*.exe" /T 2>nul || exit 0', { stdio: 'ignore' });
      } catch {
        // ignore
      }
    } else {
      // Avoid `pkill -f` on strings matching the command line itself which causes self-kill SIGKILL
      try {
        execSync('pkill -9 -x gridscan-portable 2>/dev/null || true', { stdio: 'ignore' });
        execSync('pkill -9 -x gridscan-portab 2>/dev/null || true', { stdio: 'ignore' });
      } catch {
        // ignore
      }

      // Check if port 8081 is held by an unresponsive process
      try {
        const ssOutput = execSync("ss -lptn 'sport = :8081' 2>/dev/null || true", { encoding: 'utf-8' });
        const matches = ssOutput.match(/pid=(\d+)/g);
        if (matches) {
          for (const m of matches) {
            const pid = m.replace('pid=', '').trim();
            if (pid && pid !== String(process.pid)) {
              try {
                process.kill(Number(pid), 'SIGKILL');
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // Graceful no-op
  }
}

let activeGoProcess: ReturnType<typeof spawn> | null = null;

function ensureDistPlaceholder() {
  const distDir = path.join(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');
  try {
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    if (!fs.existsSync(distIndex)) {
      const rootIndex = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndex)) {
        fs.copyFileSync(rootIndex, distIndex);
      } else {
        fs.writeFileSync(distIndex, '<!doctype html><html><body>Initializing...</body></html>', 'utf-8');
      }
      console.log('Created placeholder dist/index.html for Go embed.');
    }
  } catch (err: any) {
    console.warn('Could not ensure dist placeholder:', err?.message || err);
  }
}

async function spawnGoBackendAsync() {
  console.log('Cleaning up any stale Go backend processes...');
  cleanStaleGoProcesses();

  // Ensure dist/ exists before spawning Go (required by //go:embed all:dist in main.go)
  ensureDistPlaceholder();

  try {
    const goExecutable = await ensureGoInstalled();
    if (!goExecutable) {
      console.warn('Go runtime is unavailable. Frontend will run in simulation / preview mode.');
      return;
    }

    const goEnv: NodeJS.ProcessEnv = { ...process.env, PORT: '8081', GRIDSCAN_MODE: 'preview' };
    if (goExecutable !== 'go') {
      goEnv.GOROOT = path.join(process.cwd(), 'go');
    }

    console.log(`Spawning Go backend with: ${goExecutable}`);
    const goBackend = spawn(goExecutable, ['run', '.'], {
      stdio: 'inherit',
      env: goEnv
    });

    activeGoProcess = goBackend;

    goBackend.on('error', (err) => {
      console.error('Failed to start Go backend:', err);
    });

    goBackend.on('exit', (code) => {
      console.log(`Go backend exited with code ${code}`);
      activeGoProcess = null;
    });

    console.log('Waiting for Go backend to be ready on http://127.0.0.1:8081/api/info...');
    const ready = await waitForGoBackend('http://127.0.0.1:8081/api/info', 25000);
    if (ready) {
      console.log('Go backend is ready and listening on port 8081.');
    } else {
      console.warn('Go backend did not respond within timeout, will proxy as available.');
    }
  } catch (err) {
    console.error('Error during Go backend startup:', err);
  }
}

async function startServer() {
  const app = express();

  // Parse port and host from environment, npm_config_*, or command line args
  let PORT = Number(process.env.PORT || process.env.npm_config_port) || 3000;
  let HOST = process.env.HOST || process.env.npm_config_host || '0.0.0.0';

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--port' && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (!isNaN(parsed) && parsed > 0) PORT = parsed;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (!isNaN(parsed) && parsed > 0) PORT = parsed;
    }
    if (arg === '--host' && process.argv[i + 1]) {
      HOST = process.argv[i + 1];
    } else if (arg.startsWith('--host=')) {
      HOST = arg.slice('--host='.length);
    }
  }

  // Healthcheck endpoint for proxies and container orchestrators
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  // Proxy API requests to Go backend (port 8081)
  app.use(createProxyMiddleware({
    pathFilter: '/api',
    target: 'http://127.0.0.1:8081',
    changeOrigin: true,
    ws: true,
    timeout: 0,
    proxyTimeout: 0,
    on: {
      proxyRes: (proxyRes: any) => {
        const ct = String(proxyRes.headers?.['content-type'] || '');
        if (ct.includes('text/event-stream')) {
          proxyRes.headers['cache-control'] = 'no-cache, no-transform';
          proxyRes.headers['x-accel-buffering'] = 'no';
        }
      },
      error: (_err: any, _req: any, res: any) => {
        if (res && typeof res.writeHead === 'function' && !res.headersSent && !res.writableEnded) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Go backend is initializing, please retry shortly.' }));
        } else if (res && !res.writableEnded && typeof res.end === 'function') {
          try {
            res.end();
          } catch {}
        }
      }
    }
  }));

  // Ensure /api/* never falls through to SPA index.html (which would return 200 text/html to SSE clients)
  app.use('/api', (_req, res) => {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Go backend is unavailable or still initializing.',
      });
    }
  });

  let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    viteServer = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  }

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`🚀 Dev server running on http://${HOST}:${PORT}`);
    // Spawn Go backend concurrently in background without blocking server listen
    setImmediate(() => {
      spawnGoBackendAsync().catch((err) => {
        console.error('Async Go startup error:', err);
      });
    });
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`Failed to bind dev server on http://${HOST}:${PORT}:`, err.message);
    process.exit(1);
  });

  let shuttingDown = false;
  const cleanupAndExit = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (activeGoProcess) {
      try {
        activeGoProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
    try {
      await Promise.all([
        new Promise<void>((resolve) => httpServer.close(() => resolve())),
        viteServer ? viteServer.close().catch(() => {}) : Promise.resolve(),
      ]);
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void cleanupAndExit();
  });
  process.on('SIGTERM', () => {
    void cleanupAndExit();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
