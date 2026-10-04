
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, execSync } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import http from 'http';

async function ensureGoInstalled(): Promise<string | null> {
  // 1. Check if 'go' exists in system PATH
  try {
    execSync('go version', { stdio: 'ignore' });
    return 'go';
  } catch {
    // not in PATH
  }

  // 2. Check local downloaded binary
  const goDir = path.join(process.cwd(), 'go');
  const goExecutable = path.join(goDir, 'bin', 'go');
  if (fs.existsSync(goExecutable)) {
    return goExecutable;
  }

  console.log('Go not found in system PATH. Downloading Go 1.22.2...');
  try {
    execSync('curl -sL https://go.dev/dl/go1.22.2.linux-amd64.tar.gz | tar -xz', {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 30000,
    });
    if (fs.existsSync(goExecutable)) {
      console.log('Go downloaded successfully.');
      return goExecutable;
    }
  } catch (err: any) {
    console.warn('Could not auto-download Go runtime:', err?.message || err);
  }
  return null;
}

async function waitForGoBackend(url: string, timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
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

async function spawnGoBackendAsync() {
  console.log('Cleaning up any existing Go backend processes...');
  try {
    execSync('pkill -9 -f gridscan || true');
    execSync('pkill -9 -f "go run" || true');
  } catch (killErr) {
    console.warn('Failed to clean up old processes:', killErr);
  }

  try {
    const goExecutable = await ensureGoInstalled();
    if (!goExecutable) {
      console.warn('Go runtime is unavailable. Frontend will run in simulation / preview mode.');
      return;
    }

    console.log(`Spawning Go backend with: ${goExecutable}`);
    const goBackend = spawn(goExecutable, ['run', '.'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '8081', GRIDSCAN_MODE: 'preview' }
    });

    goBackend.on('error', (err) => {
      console.error('Failed to start Go backend:', err);
    });

    goBackend.on('exit', (code) => {
      console.log(`Go backend exited with code ${code}`);
    });

    console.log('Waiting for Go backend to be ready on http://127.0.0.1:8081/api/info...');
    const ready = await waitForGoBackend('http://127.0.0.1:8081/api/info', 10000);
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
  const PORT = Number(process.env.PORT) || 3000;

  // Proxy API requests to Go backend (port 8081)
  app.use(createProxyMiddleware({
    pathFilter: '/api',
    target: 'http://127.0.0.1:8081',
    changeOrigin: true,
    ws: true,
    on: {
      error: (_err: any, _req: any, res: any) => {
        if (res && typeof res.writeHead === 'function') {
          res.writeHead(503, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Go backend is initializing, please retry shortly.' }));
        }
      }
    }
  }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dev server running on http://localhost:${PORT}`);
    // Spawn Go backend concurrently in background without blocking server listen
    spawnGoBackendAsync().catch((err) => {
      console.error('Async Go startup error:', err);
    });
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
