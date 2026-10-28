import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createAuthAPI } from './auth.js';

test('auth flow uses expected public API paths without sending a stale JWT', async () => {
  const requests = [];
  const client = axios.create({ adapter: async config => {
    requests.push(config);
    return { status: 200, data: {}, headers: {}, config };
  } });
  const api = createAuthAPI(client);
  await api.register({ name: 'Test', email: 'test@auth.invalid', password: 'synthetic-password' });
  await api.login({ email: 'test@auth.invalid', password: 'synthetic-password' });
  await api.resendVerification('test@auth.invalid');
  await api.forgotPassword('test@auth.invalid');
  await api.resetPassword({ token: 'synthetic-reset', password: 'synthetic-new-password' });
  assert.deepEqual(requests.map(r => r.url), ['/register', '/login', '/resend-verification', '/forgot-password', '/reset-password']);
  assert.ok(requests.every(r => !r.headers.Authorization));
  assert.deepEqual(JSON.parse(requests[2].data), { email: 'test@auth.invalid' });
  assert.equal(JSON.parse(requests[4].data).token, 'synthetic-reset');
});
test('session validation and logout explicitly carry the current JWT', async () => {
  const requests = [];
  const api = createAuthAPI(axios.create({ adapter: async config => {
    requests.push(config); return { status: 200, data: {}, headers: {}, config };
  } }));
  await api.me('synthetic-session'); await api.logout('synthetic-session');
  assert.deepEqual(requests.map(r => [r.method, r.url, r.headers.Authorization]), [
    ['get', '/me', 'Bearer synthetic-session'], ['post', '/logout', 'Bearer synthetic-session'],
  ]);
});
