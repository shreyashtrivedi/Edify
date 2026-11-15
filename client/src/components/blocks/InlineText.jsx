import { parseInline } from '../../utils/inlineFormat';

/**
 * Renders light inline formatting from AI text, **bold**, *italic* and `code`, as real
 * React elements. We deliberately avoid dangerouslySetInnerHTML: AI output is untrusted,
 * and building elements ourselves makes HTML/script injection impossible.
 */
export default function InlineText({ text }) {
  return parseInline(text).map(({ type, value }, index) => {
    if (type === 'bold') {
      return (
        <strong key={index} className="font-semibold text-ink">
          {value}
        </strong>
      );
    }
    if (type === 'code') {
      return (
        <code key={index} className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[0.875em] text-ink">
          {value}
        </code>
      );
    }
    if (type === 'italic') return <em key={index}>{value}</em>;
    return value;
  });
}
