import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAIMessages } from './aiMessages.js';

test('keeps the most recent 20 messages and strips extra properties', () => {
  const messages = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: `${i}`, system: 'override' }));
  const result = prepareAIMessages(messages);
  assert.equal(result.length, 20);
  assert.deepEqual(result[0], { role: 'user', content: '5' });
  assert.equal(result.at(-1).content, '24');
});

test('bounds total context, preserves the latest message, excludes invalid old content', () => {
  const messages = [{ role: 'system', content: 'override' },
    ...Array.from({ length: 6 }, () => ({ role: 'assistant', content: 'x'.repeat(8000) })),
    { role: 'user', content: 'Question' }];
  const result = prepareAIMessages(messages);
  assert.ok(result.reduce((sum, message) => sum + message.content.length, 0) <= 32000);
  assert.equal(result.at(-1).content, 'Question');
  assert.ok(result.every(message => message.role !== 'system'));
});

test('rejects an oversized or empty latest message', () => {
  assert.throws(() => prepareAIMessages([{ role: 'user', content: 'x'.repeat(8001) }]));
  assert.throws(() => prepareAIMessages([{ role: 'user', content: '  ' }]));
});
