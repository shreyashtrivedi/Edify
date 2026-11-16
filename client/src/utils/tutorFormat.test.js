import { describe, expect, it } from 'vitest';
import { parseTutorText } from './tutorFormat';

describe('parseTutorText', () => {
  it('joins soft line breaks and splits paragraphs on blank lines', () => {
    expect(parseTutorText('Line one\nline two\n\nSecond paragraph')).toEqual([
      { type: 'paragraph', text: 'Line one line two' },
      { type: 'paragraph', text: 'Second paragraph' },
    ]);
  });

  it('starts a list right after a paragraph, and separates bullet and numbered lists', () => {
    expect(parseTutorText('Steps:\n- a\n- b\n1. x\n2) y')).toEqual([
      { type: 'paragraph', text: 'Steps:' },
      { type: 'list', ordered: false, items: ['a', 'b'] },
      { type: 'list', ordered: true, items: ['x', 'y'] },
    ]);
  });

  it('does not mistake *italic* at the start of a line for a bullet', () => {
    expect(parseTutorText('*Note*: careful')).toEqual([
      { type: 'paragraph', text: '*Note*: careful' },
    ]);
  });

  it('keeps code blocks verbatim, with the language lower-cased', () => {
    expect(parseTutorText('Look:\n```JavaScript\nconst a = 1;\n  return a;\n```\nDone')).toEqual([
      { type: 'paragraph', text: 'Look:' },
      { type: 'code', language: 'javascript', text: 'const a = 1;\n  return a;' },
      { type: 'paragraph', text: 'Done' },
    ]);
    expect(parseTutorText('```\nx\n```')).toEqual([{ type: 'code', language: 'text', text: 'x' }]);
  });

  it('shows a half-streamed code block (no closing fence yet) as code', () => {
    expect(parseTutorText('Try:\n```python\nprint("hi")')).toEqual([
      { type: 'paragraph', text: 'Try:' },
      { type: 'code', language: 'python', text: 'print("hi")' },
    ]);
  });

  it('continues a list item on an indented line', () => {
    expect(parseTutorText('- first\n  continues here\n- second')).toEqual([
      { type: 'list', ordered: false, items: ['first continues here', 'second'] },
    ]);
  });

  it('turns a stray Markdown heading into a bold paragraph', () => {
    expect(parseTutorText('### Big **idea**\ntext')).toEqual([
      { type: 'paragraph', text: '**Big idea**' },
      { type: 'paragraph', text: 'text' },
    ]);
  });

  it('handles empty text, the first streamed word and Windows line endings', () => {
    expect(parseTutorText('')).toEqual([]);
    expect(parseTutorText('Acha')).toEqual([{ type: 'paragraph', text: 'Acha' }]);
    expect(parseTutorText('a\r\n\r\nb')).toEqual([
      { type: 'paragraph', text: 'a' },
      { type: 'paragraph', text: 'b' },
    ]);
  });
});
