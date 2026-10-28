import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('authentication pages render actionable recovery states', async t => {
  const server = await createServer({ configFile: false, plugins: [react()],
    server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    async function render(page, location) {
      const module = await server.ssrLoadModule(`/src/pages/${page}.jsx`);
      return renderToStaticMarkup(createElement(StaticRouter, { location }, createElement(module.default)));
    }
    await t.test('expired confirmation provides a resend form', async () => {
      const html = await render('LoginPage', '/login?error=expired-token');
      assert.match(html, /Le lien de confirmation a expiré/);
      assert.match(html, /Renvoyer le lien de confirmation/);
    });
    await t.test('invalid confirmation is distinguished from expiry', async () => {
      const html = await render('LoginPage', '/login?error=invalid-token');
      assert.match(html, /invalide ou a déjà été utilisé/);
    });
    await t.test('SMTP failure keeps the account-created message and offers resend', async () => {
      const html = await render('CheckEmailPage', { pathname: '/check-email',
        state: { email: 'synthetic@auth.invalid', emailSent: false } });
      assert.match(html, /compte est créé/);
      assert.match(html, /échoué/);
      assert.match(html, /value="synthetic@auth.invalid"/);
      assert.match(html, /Renvoyer/);
    });
    await t.test('reset page without token offers a fresh request instead of a password form', async () => {
      const html = await render('ResetPasswordPage', '/reset-password');
      assert.match(html, /Lien invalide/);
      assert.match(html, /href="\/forgot-password"/);
      assert.doesNotMatch(html, /type="password"/);
    });
    await t.test('reset page with token permits entering a new password', async () => {
      const html = await render('ResetPasswordPage', '/reset-password?token=synthetic-reset');
      assert.match(html, /Nouveau mot de passe/);
      assert.match(html, /type="password"/);
      assert.doesNotMatch(html, /synthetic-reset/); // Token is never rendered in page content.
    });
    await t.test('forgot-password page renders an email request form', async () => {
      const html = await render('ForgotPasswordPage', '/forgot-password');
      assert.match(html, /type="email"/);
      assert.match(html, /<form/);
    });
  } finally { await server.close(); }
});
