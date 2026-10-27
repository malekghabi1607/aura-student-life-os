// Match the server limits; keep recent context without changing the displayed chat.
export function prepareAIMessages(messages) {
  const latest = messages.at(-1);
  if (!latest || !latest.content?.trim() || latest.content.length > 8000) {
    throw new Error('Le message doit contenir entre 1 et 8 000 caractères.');
  }
  const recent = messages.slice(-20).filter(message =>
    ['user', 'assistant'].includes(message.role) && typeof message.content === 'string'
      && message.content.trim() && message.content.length <= 8000
  ).map(({ role, content }) => ({ role, content }));
  while (recent.reduce((sum, message) => sum + message.content.length, 0) > 32000) recent.shift();
  return recent;
}
