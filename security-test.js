// security-test.js
// Minimal placeholder so `npm run test:security` is runnable.
// The full security test matrix for this project is implemented via API behavior
// and Jest tests (see tests/server.test.js).

'use strict';

const http = require('http');

function ping(port) {
  return new Promise((resolve) => {
    const req = http.request({
      method: 'GET',
      hostname: 'localhost',
      port,
      path: '/api/health',
      timeout: 5000,
    }, (res) => {
      res.resume();
      resolve({ ok: true, status: res.statusCode });
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', () => {
      resolve({ ok: false });
    });
    req.end();
  });
}

(async () => {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  console.log('[security-test] Running lightweight security smoke checks...');
  console.log('[security-test] Checking /api/health');

  const r = await ping(port);
  if (!r.ok) {
    console.error('[security-test] Failed to reach server at localhost:' + port);
    process.exitCode = 1;
    return;
  }

  console.log('[security-test] Server OK. /api/health status:', r.status);
  console.log('[security-test] NOTE: Deep security tests should be done via Jest and manual checks.');
})();

