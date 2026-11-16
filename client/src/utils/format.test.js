import { describe, expect, it } from 'vitest';
import { formatDuration, slugify } from './format';

describe('formatDuration', () => {
  it('formats minutes and seconds, adding hours only when needed', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(780)).toBe('13:00');
    expect(formatDuration(3730)).toBe('1:02:10');
  });
});

describe('slugify', () => {
  it('makes safe file names', () => {
    expect(slugify('React Hooks: From Zero to Hero!')).toBe('react-hooks-from-zero-to-hero');
    expect(slugify('Café & Crème brûlée')).toBe('cafe-creme-brulee');
  });

  it('falls back to "edify" when nothing usable is left, and caps the length', () => {
    expect(slugify('!!!')).toBe('edify');
    expect(slugify('हिंदी')).toBe('edify');
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });
});
