/**
 * Splits a tutor answer into blocks the chat can display: paragraphs, lists and code.
 *
 * The tutor writes plain text with light Markdown (its prompt lists exactly what is allowed).
 * Inline **bold** / `code` inside paragraphs and list items is handled later by InlineText,
 * so nothing here ever becomes raw HTML.
 *
 * Works on a half-written answer too (while it streams in): an unclosed ``` block is shown
 * as code until its closing fence arrives.
 *
 *   parseTutorText('Hi **there**\n\n- one\n- two')
 *   → [{ type: 'paragraph', text: 'Hi **there**' },
 *      { type: 'list', ordered: false, items: ['one', 'two'] }]
 */
const FENCE_OPEN = /^\s*```\s*([\w+#.-]*)\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/; // not allowed by the prompt, but shown nicely if it slips in

export function parseTutorText(text = '') {
  const blocks = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fence = line.match(FENCE_OPEN);
    if (fence) {
      flushParagraph();
      flushList();
      const code = [];
      for (i += 1; i < lines.length && !FENCE_CLOSE.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({
        type: 'code',
        language: fence[1].toLowerCase() || 'text',
        text: code.join('\n'),
      });
      continue;
    }

    const item = line.match(BULLET) ?? line.match(NUMBERED);
    if (item) {
      flushParagraph();
      const ordered = !BULLET.test(line);
      if (list?.ordered !== ordered) {
        flushList();
        list = { type: 'list', ordered, items: [] };
      }
      list.items.push(item[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    // An indented line right after a list item continues that item
    if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    flushList();
    const heading = line.match(HEADING);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'paragraph', text: `**${heading[1].replace(/\*\*/g, '')}**` });
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}
