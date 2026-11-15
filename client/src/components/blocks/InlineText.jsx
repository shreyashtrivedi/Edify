/**
 * Renders light inline formatting from AI text, **bold**, *italic* and `code`, as real
 * React elements. We deliberately avoid dangerouslySetInnerHTML: AI output is untrusted,
 * and building elements ourselves makes HTML/script injection impossible.
 */
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;

export default function InlineText({ text }) {
  return text.split(TOKEN).map((part, index) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[0.875em] text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
