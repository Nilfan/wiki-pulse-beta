import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Run after build:frontend. Uses only a mock backend, never a database.
const seen = [];
let fail = false;
const backend = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  seen.push({ url: req.url, method: req.method, body });
  if (fail) { res.writeHead(503); return res.end('offline'); }
  const url = new URL(req.url, 'http://mock');
  if (url.searchParams.get('format') === 'csv') {
    res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="test.csv"', 'x-export-limit': '5000' });
    return res.end('id,type\n1,edit\n');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end(); }
  const now = Date.now();
  const data = url.pathname.endsWith('/heartbeat') ? { lastEventMs: null, checkedAtMs: now }
    : url.pathname.endsWith('/insights') ? { events: 0, wikis: 0, paths: 0, lastEventMs: null, untilMs: now, buckets: [], types: [] }
    : url.pathname.endsWith('/breakdown') ? { rows: [], total: 0, groupCount: 0, offset: 0, untilMs: now }
    : url.pathname.endsWith('/events') ? { events: [], total: 0, groupCount: 0, untilMs: now }
    : url.pathname.endsWith('/recent') ? []
    : url.pathname.endsWith('/feed') ? { events: [], total: 0, fetchedAt: now }
    : { ok: true };
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(data));
});
backend.listen(0, '127.0.0.1');
await once(backend, 'listening');
const backendOrigin = `http://127.0.0.1:${backend.address().port}`;
const port = process.env.TEST_FRONTEND_PORT || '3219';
const origin = `http://127.0.0.1:${port}`;
const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  env: { ...process.env, APP_ROLE: '', DATABASE_URL: '', BACKEND_API_URL: backendOrigin },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
frontend.stdout.on('data', b => logs += b);
frontend.stderr.on('data', b => logs += b);
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (frontend.exitCode !== null) throw new Error(logs);
    try { await fetch(`${origin}/api/feed`); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  assert.ok(ready, logs);
  for (const route of ['events', 'insights', 'breakdown', 'recent', 'heartbeat']) {
    const query = 'range=1h&eventType=edit&eventType=new&dimension=page';
    assert.equal((await fetch(`${origin}/api/dashboard/${route}?${query}`)).status, 200);
    assert.ok(seen.some(r => r.url === `/api/dashboard/${route}?${query}`));
  }
  const csv = await fetch(`${origin}/api/dashboard/recent?format=csv`);
  assert.equal(csv.headers.get('x-export-limit'), '5000');
  assert.match(csv.headers.get('content-disposition'), /test.csv/);
  assert.match(await csv.text(), /1,edit/);
  const payload = JSON.stringify({ org_id: '1', type: 'edit', host: 'example.org', path: '/' });
  await fetch(`${origin}/api/track`, { method: 'POST', body: payload, headers: { 'content-type': 'application/json' } });
  assert.ok(seen.some(r => r.method === 'POST' && r.url === '/api/track' && r.body === payload));
  assert.equal((await fetch(`${origin}/api/track`, { method: 'OPTIONS' })).status, 204);
  await fetch(`${origin}/api/dashboard/revalidate`, { method: 'POST' });
  assert.ok(seen.some(r => r.method === 'POST' && r.url === '/api/dashboard/revalidate'));
  seen.length = 0;
  const page = await fetch(`${origin}/dashboard?range=1h&eventType=edit&eventType=new`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.ok(!html.includes('Backend API failed'), logs);
  for (const route of ['events', 'insights', 'breakdown', 'recent', 'heartbeat']) {
    assert.ok(seen.some(r => r.url.startsWith(`/api/dashboard/${route}`)), `SSR did not fetch ${route}: ${logs}`);
  }
  fail = true;
  assert.equal((await fetch(`${origin}/api/feed`)).status, 503);
  await new Promise(resolve => backend.close(resolve));
  assert.equal((await fetch(`${origin}/api/feed`)).status, 502);
  console.log('PASS: database-free SSR, all analytics proxies, filters, CSV, tracking, refresh, upstream errors and unavailable backend');
} finally {
  frontend.kill('SIGTERM');
  backend.close();
  await once(frontend, 'exit');
}
