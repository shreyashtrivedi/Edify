/**
 * Fake YouTube Data API responses. Tests stub the global fetch() with youtubeFetch(), so no
 * real requests (or quota) are ever used.
 */
import { vi } from 'vitest';

export const VIDEOS = [
  { id: 'short123456', title: 'Hooks in 30 seconds #shorts', duration: 'PT30S', views: 9_000_000 },
  { id: 'good1234567', title: 'useEffect explained', duration: 'PT12M30S', views: 400_000 },
  { id: 'best1234567', title: 'Learn useEffect in 13 minutes', duration: 'PT13M', views: 900_000 },
  { id: 'livestream1', title: '4 hour React marathon', duration: 'PT4H2M', views: 5_000_000 },
];

const json = (body, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** A fetch() replacement that answers search.list and videos.list from `videos`. */
export function youtubeFetch(videos = VIDEOS) {
  return vi.fn((url) => {
    const { pathname } = new URL(url);
    if (pathname.endsWith('/search')) {
      return json({
        items: videos.map((v) => ({
          id: { videoId: v.id },
          snippet: {
            title: v.title,
            channelTitle: 'Edify Test Channel',
            thumbnails: { high: { url: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` } },
          },
        })),
      });
    }
    if (pathname.endsWith('/videos')) {
      return json({
        items: videos.map((v) => ({
          id: v.id,
          contentDetails: { duration: v.duration },
          statistics: { viewCount: String(v.views) },
        })),
      });
    }
    return json({ error: { message: 'unexpected endpoint' } }, 404);
  });
}

/** A fetch() replacement that fails like an exhausted daily quota. */
export const quotaExceededFetch = () =>
  vi.fn(() =>
    json({ error: { code: 403, message: 'Quota exceeded', errors: [{ reason: 'quotaExceeded' }] } }, 403),
  );
