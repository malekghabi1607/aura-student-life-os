import { createElement, Fragment } from 'react';

// Preserve the chat's emphasis and line breaks without ever parsing HTML or URLs.
export default function SafeMessageContent({ text }) {
  return String(text ?? '').split('\n').map((line, lineIndex) =>
    createElement(Fragment, { key: lineIndex },
      lineIndex > 0 ? createElement('br') : null,
      ...line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return createElement('strong', { key: index }, part.slice(2, -2));
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return createElement('em', { key: index }, part.slice(1, -1));
        }
        return part;
      })
    )
  );
}
