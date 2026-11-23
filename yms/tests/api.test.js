import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ym-')), port = 4300 + Math.floor(Math.random() * 500), base = `http://127.0.0.1:${port}`;
let srv, token;
const call = async (p, o = {}) => { const r = await fetch(base + p, { ...o, headers: { 'Content-Type': 'application/json', ...(o.token && { Authorization: 'Bearer ' + o.token }) }, body: o.body && JSON.stringify(o.body) }); const t = await r.text(); let j; try { j = JSON.parse(t) } catch {} return { s: r.status, j, t }; };
before(async () => {
  srv = spawn('node', ['--no-warnings', 'server/index.js'], { env: { ...process.env, PORT: port, DATABASE_FILE: path.join(dir, 't.db'), ADMIN_EMAIL: 'a@test.com', ADMIN_PASSWORD: 'Password-12345', TOKEN_SECRET: 'x'.repeat(32) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/health'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
});
after(() => { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); });
const good = { fullName: 'Jane Doe', email: 'jane@x.com', phone: '0712345678', course: 'BEd', yearOfStudy: '2', positionId: 8, motivation: 'm'.repeat(160), agree: true };
test('pages and traversal', async () => {
  for (const p of ['/', '/about', '/programs', '/team', '/gallery', '/get-involved', '/book', '/contact', '/admin/']) assert.equal((await call(p)).s, 200);
  assert.equal((await call('/nope')).s, 404); assert.equal((await call('/..%2fserver/index.js')).s, 404);
});
test('positions', async () => { const { j } = await call('/api/positions'); assert.ok(j.positions.length >= 11); assert.ok(j.positions.find(p => p.title === 'Social Media Manager').isNew); });
test('application validation, create, duplicate', async () => {
  const bad = await call('/api/applications', { method: 'POST', body: { ...good, email: 'x', motivation: 'short' } });
  assert.equal(bad.s, 422); assert.ok(bad.j.errors.email && bad.j.errors.motivation);
  assert.equal((await call('/api/applications', { method: 'POST', body: good })).s, 201);
  assert.equal((await call('/api/applications', { method: 'POST', body: good })).s, 409);
});
test('booking', async () => assert.equal((await call('/api/bookings', { method: 'POST', body: { schoolName: 'S', county: 'C', contactName: 'N', contactRole: 'R', email: 'a@b.co', phone: '0712345678', levels: ['Junior school'], format: 'Assembly talk', focusAreas: ['Peer pressure'] } })).s, 201));
test('auth, summary, patch, csv', async () => {
  assert.equal((await call('/api/admin/summary')).s, 401);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'a@test.com', password: 'wrong' } })).s, 401);
  token = (await call('/api/auth/login', { method: 'POST', body: { email: 'a@test.com', password: 'Password-12345' } })).j.token; assert.ok(token);
  assert.equal((await call('/api/admin/summary', { token })).j.applications.total, 1);
  const id = (await call('/api/admin/applications', { token })).j.applications[0].id;
  assert.equal((await call('/api/admin/applications/' + id, { method: 'PATCH', token, body: { status: 'accepted' } })).j.status, 'accepted');
  assert.ok((await call('/api/admin/applications.csv', { token })).t.includes('Jane Doe'));
});
test('deadline closes applications', async () => {
  await call('/api/admin/settings', { method: 'PUT', token, body: { applicationsDeadline: '2000-01-01' } });
  assert.equal((await call('/api/site')).j.applicationsOpen, false);
  assert.equal((await call('/api/applications', { method: 'POST', body: { ...good, email: 'z@x.com' } })).s, 403);
  await call('/api/admin/settings', { method: 'PUT', token, body: { applicationsDeadline: '' } });
  assert.equal((await call('/api/site')).j.applicationsOpen, true);
});
