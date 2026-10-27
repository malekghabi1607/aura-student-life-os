import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SafeMessageContent from './SafeMessageContent.js';

const render = text => renderToStaticMarkup(createElement(SafeMessageContent, { text }));

test('preserves emphasis and line breaks', () => {
  assert.equal(render('**Aura**\n*Bonjour*'), '<strong>Aura</strong><br/><em>Bonjour</em>');
});

for (const role of ['user', 'assistant']) {
  test(`${role} content cannot inject HTML, handlers, or executable links`, () => {
    const html = render('<img src=x onerror="alert(1)"><script>alert(2)</script>\n**<svg onload="alert(3)">**\n[x](javascript:alert(4))');
    assert.ok(!/<(?:img|script|svg|a)\b/i.test(html));
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('<strong>&lt;svg'));
    assert.ok(html.includes('[x](javascript:alert(4))'));
  });
}
