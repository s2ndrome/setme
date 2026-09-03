import sanitizeHtml from 'sanitize-html';

const MAX_HTML_BYTES = 40000;

// Post bodies are authored with a small contenteditable + execCommand
// toolbar (bold/italic/underline/strike, color, font, size, image, link) —
// this allowlist matches exactly what that toolbar can produce, nothing
// more, so nothing else (script, iframe, event handlers, style tags, form
// elements) ever survives into stored content that every visitor's browser
// renders as trusted HTML.
export function sanitizeRichText(raw) {
  const input = String(raw ?? '').slice(0, MAX_HTML_BYTES);
  return sanitizeHtml(input, {
    allowedTags: [
      'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      span: ['style'],
      div: ['style'],
      p: ['style']
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'font-family': [/^[\w\s,'"-]+$/],
        'font-size': [/^\d{1,3}px$/],
        'text-align': [/^(left|center|right)$/]
      }
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener' })
    }
  });
}
