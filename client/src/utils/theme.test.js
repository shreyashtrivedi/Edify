import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, readStoredTheme, storeTheme } from './theme';

/** A tiny in-memory localStorage (tests run in Node, which has none). */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('readStoredTheme', () => {
  it('returns the saved choice', () => {
    vi.stubGlobal('localStorage', fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }));
    expect(readStoredTheme()).toBe('dark');
  });

  it("falls back to 'system' for nothing saved, junk values, or blocked storage", () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(readStoredTheme()).toBe('system');

    vi.stubGlobal('localStorage', fakeStorage({ [THEME_STORAGE_KEY]: 'purple' }));
    expect(readStoredTheme()).toBe('system');

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(readStoredTheme()).toBe('system');
  });
});

describe('storeTheme', () => {
  it("saves light/dark, and stores 'system' (the default) as nothing saved", () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    storeTheme('dark');
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark');

    storeTheme('system');
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => storeTheme('dark')).not.toThrow();
  });
});
