import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestDatabase } from './helpers/db.js';
import { VIDEOS, quotaExceededFetch, youtubeFetch } from './helpers/youtube.js';

// vi.hoisted runs before every import, so config/env.js sees the key when it loads.
vi.hoisted(() => {
  process.env.YOUTUBE_API_KEY = 'test-youtube-key';
});
const { attachVideos, decodeEntities, findVideo, parseDuration, pickBestVideo } = await import(
  '../services/youtube.service.js'
);
const { VideoCache } = await import('../models/VideoCache.js');

useTestDatabase();
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseDuration', () => {
  it('converts ISO 8601 durations to seconds', () => {
    expect(parseDuration('PT1H2M10S')).toBe(3730);
    expect(parseDuration('PT13M5S')).toBe(785);
    expect(parseDuration('PT45S')).toBe(45);
    expect(parseDuration('P1DT1S')).toBe(86401);
    expect(parseDuration('')).toBe(0);
    expect(parseDuration('garbage')).toBe(0);
  });
});

describe('decodeEntities', () => {
  it('turns the HTML-escaped titles from search.list into plain text', () => {
    expect(decodeEntities('Don&#39;t Use &quot;var&quot; &amp; &lt;div&gt;')).toBe(`Don't Use "var" & <div>`);
  });
});

describe('pickBestVideo', () => {
  const video = (id, minutes, views) => ({ videoId: id, durationSeconds: minutes * 60, views });

  it('skips Shorts and very long videos, then picks the most viewed of the top 3', () => {
    const best = pickBestVideo([
      video('short', 0.5, 9e6),
      video('a', 10, 1e5),
      video('b', 12, 5e5),
      video('long', 240, 9e6),
      video('c', 8, 2e5),
      video('d', 9, 8e6), // 4th lesson-sized result: not considered, relevance matters most
    ]);
    expect(best).toEqual({ videoId: 'b', durationSeconds: 720 }); // view count is not stored
  });

  it('falls back to the most relevant non-Short when nothing is lesson-sized', () => {
    expect(pickBestVideo([video('short', 0.5, 1), video('long', 120, 1)]).videoId).toBe('long');
    expect(pickBestVideo([video('short', 0.5, 1)])).toBeNull();
    expect(pickBestVideo([])).toBeNull();
  });
});

describe('findVideo', () => {
  it('searches YouTube safely and returns the best lesson-sized video', async () => {
    const fetchMock = youtubeFetch();
    vi.stubGlobal('fetch', fetchMock);

    const video = await findVideo('useEffect cleanup tutorial');

    expect(video).toMatchObject({ videoId: 'best1234567', title: 'Learn useEffect in 13 minutes', durationSeconds: 780 });
    const searchUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(searchUrl.searchParams.get('videoEmbeddable')).toBe('true');
    expect(searchUrl.searchParams.get('safeSearch')).toBe('strict');
    expect(searchUrl.searchParams.get('key')).toBe('test-youtube-key');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('id')).toBe(VIDEOS.map((v) => v.id).join(','));
  });

  it('caches results by normalised query, so repeats cost no quota', async () => {
    const fetchMock = youtubeFetch();
    vi.stubGlobal('fetch', fetchMock);

    const first = await findVideo('useEffect Cleanup  Tutorial');
    const second = await findVideo('  useeffect cleanup tutorial ');

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2); // one search + one videos call, then cache hits
    expect(await VideoCache.countDocuments()).toBe(1);
  });

  it('caches "nothing suitable found" too', async () => {
    const fetchMock = youtubeFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    expect(await findVideo('an extremely obscure topic')).toBeNull();
    expect(await findVideo('an extremely obscure topic')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null without throwing when the quota is used up, and does not cache the failure', async () => {
    vi.stubGlobal('fetch', quotaExceededFetch());

    expect(await findVideo('react hooks')).toBeNull();
    expect(await VideoCache.countDocuments()).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('quotaExceeded'));
  });
});

describe('attachVideos', () => {
  it('adds a video to video blocks only', async () => {
    vi.stubGlobal('fetch', youtubeFetch());
    const content = [
      { type: 'paragraph', text: 'Intro' },
      { type: 'video', query: 'useEffect tutorial' },
    ];

    const result = await attachVideos(content);

    expect(result[0]).toEqual(content[0]);
    expect(result[1]).toMatchObject({ type: 'video', query: 'useEffect tutorial', video: { videoId: 'best1234567' } });
  });
});
