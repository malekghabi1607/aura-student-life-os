import test from 'node:test';
import assert from 'node:assert/strict';
import { authError, clearSession, readSession, saveSession } from './authSession.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('corrupt stored user cannot break login and clears both session values', () => {
  const store = storage(); store.setItem('auth_token', 'synthetic'); store.setItem('auth_user', '{broken');
  assert.equal(readSession(store), null);
  assert.equal(store.getItem('auth_token'), null);
  assert.equal(store.getItem('auth_user'), null);
});
test('a stored user without a token is not authenticated', () => {
  const store = storage(); store.setItem('auth_user', JSON.stringify({ email: 'a@test.invalid' }));
  assert.equal(readSession(store), null);
});
test('login persists session and local logout removes only auth data', () => {
  const store = storage(); store.setItem('preferences', 'preserved');
  saveSession(store, 'synthetic', { email: 'a@test.invalid', name: 'A' });
  assert.equal(readSession(store).user.email, 'a@test.invalid');
  clearSession(store);
  assert.equal(readSession(store), null);
  assert.equal(store.getItem('preferences'), 'preserved');
});
test('a response without a token cannot create a session', () => {
  assert.throws(() => saveSession(storage(), null, { email: 'a@test.invalid' }));
});
test('network and server errors are distinguished from invalid credentials', () => {
  assert.match(authError({}), /inaccessible/);
  assert.match(authError({ response: { status: 503, data: { message: 'private-provider-detail' } } }), /temporairement/);
  assert.equal(authError({ response: { status: 401 } }), 'Email ou mot de passe incorrect.');
});
test('verification, disabled accounts and validation errors have useful messages', () => {
  assert.match(authError({ response: { status: 403, data: { code: 'EMAIL_NOT_VERIFIED' } } }), /renvoyer/);
  assert.equal(authError({ response: { status: 403, data: { code: 'ACCOUNT_DISABLED', message: 'Compte désactivé.' } } }), 'Compte désactivé.');
  assert.equal(authError({ response: { status: 400, data: { errors: { password: 'Mot de passe trop court.' } } } }), 'Mot de passe trop court.');
  assert.match(authError({ response: { status: 400, data: { message: 'Lien expiré.' } } }), /expiré/);
});
