import { describe, expect, it } from 'vitest';
import { parseInline, stripInline } from './inlineFormat';

describe('parseInline', () => {
  it('splits bold, code and italic into segments', () => {
    expect(parseInline('Use **useState** for `count`, *always*.')).toEqual([
      { type: 'text', value: 'Use ' },
      { type: 'bold', value: 'useState' },
      { type: 'text', value: ' for ' },
      { type: 'code', value: 'count' },
      { type: 'text', value: ', ' },
      { type: 'italic', value: 'always' },
      { type: 'text', value: '.' },
    ]);
  });

  it('leaves a lone asterisk (multiplication) as plain text', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ type: 'text', value: '2 * 3 = 6' }]);
  });

  it('keeps markers inside code as they are', () => {
    expect(parseInline('`a**b`')).toEqual([{ type: 'code', value: 'a**b' }]);
  });

  it('treats missing text as empty', () => {
    expect(parseInline()).toEqual([]);
  });
});

describe('stripInline', () => {
  it('removes the formatting markers', () => {
    expect(stripInline('**Hooks** let you use `state`')).toBe('Hooks let you use state');
  });
});
