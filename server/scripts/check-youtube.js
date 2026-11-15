/**
 * Smoke test for the YouTube setup:   npm run check:youtube
 *
 * Runs one real search (101 quota units) WITHOUT the cache, using YOUTUBE_API_KEY from .env,
 * and prints the video Edify would embed for it.
 */
import { env } from '../config/env.js';
import { parseDuration, pickBestVideo } from '../services/youtube.service.js';

if (!env.YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY is not set. Add it to server/.env (see .env.example).');
  process.exit(1);
}

const query = process.argv[2] ?? 'react useEffect hook explained';
const api = (endpoint, params) =>
  fetch(
    `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key: env.YOUTUBE_API_KEY })}`,
  ).then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${body.error?.errors?.[0]?.reason ?? ''}: ${body.error?.message}`);
    return body;
  });

console.log(`🔎 Searching YouTube for "${query}"...`);
try {
  const startedAt = Date.now();
  const search = await api('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'strict',
    maxResults: '5',
  });
  const ids = search.items.map((item) => item.id.videoId);
  const details = await api('videos', { part: 'contentDetails,statistics', id: ids.join(',') });

  const candidates = details.items.map((item) => ({
    videoId: item.id,
    title: search.items.find((s) => s.id.videoId === item.id)?.snippet.title,
    channel: search.items.find((s) => s.id.videoId === item.id)?.snippet.channelTitle,
    durationSeconds: parseDuration(item.contentDetails.duration),
    views: Number(item.statistics.viewCount ?? 0),
  }));

  for (const c of candidates) {
    console.log(`   - ${Math.round(c.durationSeconds / 60)} min, ${c.views.toLocaleString()} views: ${c.title}`);
  }
  const best = pickBestVideo(candidates);
  console.log(`✅ Works! ${Date.now() - startedAt}ms. Edify would embed:`);
  console.log(`   "${best?.title}" by ${best?.channel}  https://youtu.be/${best?.videoId}`);
} catch (error) {
  console.error(`❌ Request failed: ${error.message}`);
  console.error('   Check that the key is correct and "YouTube Data API v3" is enabled for its project.');
  process.exit(1);
}
