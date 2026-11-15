/**
 * Parses the light inline formatting the AI uses, **bold**, *italic* and `code`, into
 * segments. Shared by the web renderer (InlineText) and the PDF export, so both always
 * agree on what is bold or code.
 *
 *   parseInline('Use **useState** for `count`')
 *   → [{ type: 'text', value: 'Use ' }, { type: 'bold', value: 'useState' },
 *      { type: 'text', value: ' for ' }, { type: 'code', value: 'count' }]
 */
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;

export function parseInline(text = '') {
  return text
    .split(TOKEN)
    .filter(Boolean)
    .map((part) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return { type: 'bold', value: part.slice(2, -2) };
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return { type: 'code', value: part.slice(1, -1) };
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return { type: 'italic', value: part.slice(1, -1) };
      }
      return { type: 'text', value: part };
    });
}

/** The same text with the formatting markers removed (for plain-text uses). */
export const stripInline = (text) => parseInline(text).map((segment) => segment.value).join('');
