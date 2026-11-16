import { describe, expect, it } from 'vitest';
import { pdfText } from './text';

describe('pdfText (makes text safe for the built-in PDF fonts)', () => {
  it('keeps everything the font can show, including accents and curly quotes', () => {
    expect(pdfText('Café “quotes” — fine € 5')).toBe('Café “quotes” — fine € 5');
  });

  it('spells out arrows, maths symbols and Greek letters', () => {
    expect(pdfText('a → b ≤ c, π ≈ 3.14, x ≠ y')).toBe('a -> b <= c, pi ~ 3.14, x != y');
  });

  it('drops emoji, including joined ones', () => {
    expect(pdfText('Great job 🎉👩‍💻!')).toBe('Great job !');
  });

  it('strips accents the font lacks, and shows "?" for scripts it has no letters for', () => {
    expect(pdfText('ā ō')).toBe('a o');
    expect(pdfText('漢字')).toBe('??');
  });

  it('copes with missing or non-string input', () => {
    expect(pdfText()).toBe('');
    expect(pdfText(42)).toBe('42');
  });
});
