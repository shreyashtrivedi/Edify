import { describe, expect, it } from 'vitest';
import { parseOrigins } from '../config/env.js';

describe('parseOrigins (CLIENT_URL → allowed CORS origins)', () => {
  it('splits a comma-separated list and trims spaces', () => {
    expect(parseOrigins('https://edify.vercel.app, http://localhost:5173')).toEqual([
      'https://edify.vercel.app',
      'http://localhost:5173',
    ]);
  });

  it('removes trailing slashes, which browsers never send in the Origin header', () => {
    expect(parseOrigins('https://edify.vercel.app/')).toEqual(['https://edify.vercel.app']);
    expect(parseOrigins('https://edify.vercel.app//')).toEqual(['https://edify.vercel.app']);
  });

  it('ignores empty entries from stray commas', () => {
    expect(parseOrigins('https://edify.vercel.app,, ,')).toEqual(['https://edify.vercel.app']);
  });
});
