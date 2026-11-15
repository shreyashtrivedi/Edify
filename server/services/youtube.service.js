/**
 * YouTube integration: turns the AI's search query into one real, embeddable video.
 *
 * Why not let the AI write the video URL? Language models invent plausible-looking video
 * ids that don't exist. So the AI only writes a *search query* (e.g. "useEffect cleanup
 * function tutorial") and we look it up with the official YouTube Data API.
 *
 * Picking the video (2 API calls, only on a cache miss):
 *  1. search.list (100 quota units): top 5 embeddable, safe-search videos by relevance.
 *  2. videos.list (1 unit): their durations and view counts.
 *  3. Keep "lesson-sized" videos (3 to 45 minutes: no Shorts, no 4-hour livestreams), and
 *     among the 3 most relevant of those, pick the most viewed (popularity as a quality signal).
 *
 * A video is a nice extra, never a requirement: every failure (no key, quota used up,
 * network error) returns null and the lesson falls back to a "search on YouTube" link.
 */
import { env } from '../config/env.js';
import { VideoCache } from '../models/VideoCache.js';

const API_URL = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 8000;
const FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000; // re-check found videos monthly
const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000; // retry "nothing found" after a day

const MIN_SECONDS = 3 * 60;
const MAX_SECONDS = 45 * 60;

export const isYouTubeConfigured = () => Boolean(env.YOUTUBE_API_KEY);

/** "  React   useEffect Tutorial " and "react useeffect tutorial" share one cache entry. */
export const normalizeQuery = (query) => query.trim().toLowerCase().replace(/\s+/g, ' ');

/** ISO 8601 duration from the API ("PT1H2M10S") → seconds (3730). */
export function parseDuration(iso = '') {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  // Missing parts are undefined (e.g. no hours in "PT13M5S"), so default them to 0 BEFORE
  // converting: Number(undefined) would be NaN.
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * search.list returns titles HTML-escaped ("Don&#39;t &amp; Do"). React would show those
 * characters literally, so decode them to plain text once, here.
 */
const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
export const decodeEntities = (text = '') =>
  text.replace(/&(amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity]);

async function callYouTube(endpoint, params) {
  const url = new URL(`${API_URL}/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key: env.YOUTUBE_API_KEY });

  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const reason = body.error?.errors?.[0]?.reason ?? body.error?.message ?? response.statusText;
    throw new Error(`YouTube ${endpoint} failed (${response.status}): ${reason}`);
  }
  return response.json();
}

/** Applies the selection rules described at the top of this file. */
export function pickBestVideo(candidates) {
  const lessonSized = candidates.filter(
    (video) => video.durationSeconds >= MIN_SECONDS && video.durationSeconds <= MAX_SECONDS,
  );
  // Nothing lesson-sized? Take the most relevant video that is at least not a Short.
  const pool = lessonSized.length
    ? lessonSized.slice(0, 3)
    : candidates.filter((video) => video.durationSeconds >= 60).slice(0, 1);
  if (!pool.length) return null;

  const best = pool.reduce((top, video) => (video.views > top.views ? video : top));
  const { videoId, title, channel, thumbnail, durationSeconds } = best; // views only matter for choosing
  return { videoId, title, channel, thumbnail, durationSeconds };
}

async function searchYouTube(query) {
  const search = await callYouTube('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    videoEmbeddable: 'true', // only videos that can play inside our page
    safeSearch: 'strict',
    relevanceLanguage: 'en',
    maxResults: '5',
  });

  const ids = search.items?.map((item) => item.id.videoId).filter(Boolean) ?? [];
  if (!ids.length) return null;

  const details = await callYouTube('videos', {
    part: 'contentDetails,statistics',
    id: ids.join(','),
  });
  const detailsById = new Map(details.items?.map((item) => [item.id, item]) ?? []);

  const candidates = search.items
    .filter((item) => detailsById.has(item.id.videoId))
    .map((item) => {
      const detail = detailsById.get(item.id.videoId);
      return {
        videoId: item.id.videoId,
        title: decodeEntities(item.snippet.title),
        channel: decodeEntities(item.snippet.channelTitle),
        thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
        durationSeconds: parseDuration(detail.contentDetails?.duration),
        views: Number(detail.statistics?.viewCount ?? 0),
      };
    });

  return pickBestVideo(candidates);
}

/**
 * Finds a video for a search query, using the cache when possible.
 * @returns {Promise<null | { videoId, title, channel, thumbnail, durationSeconds }>}
 */
export async function findVideo(rawQuery) {
  if (!isYouTubeConfigured() || !rawQuery?.trim()) return null;
  const query = normalizeQuery(rawQuery);

  const cached = await VideoCache.findOne({ query }).lean();
  if (cached) return cached.video;

  try {
    const startedAt = Date.now();
    const video = await searchYouTube(query);
    if (!env.isTest) {
      console.log(`🎬 YouTube "${query}" → ${video ? `"${video.title}"` : 'no suitable video'} in ${Date.now() - startedAt}ms`);
    }
    const ttl = video ? FOUND_TTL_MS : NOT_FOUND_TTL_MS;
    await VideoCache.updateOne(
      { query },
      { $set: { video, expiresAt: new Date(Date.now() + ttl) } },
      { upsert: true },
    );
    return video;
  } catch (error) {
    // Errors are NOT cached: a quota or network problem today shouldn't hide videos tomorrow.
    console.warn(`⚠️  ${error.message}`);
    return null;
  }
}

/**
 * Adds a `video` to every video block of a lesson (lookups run in parallel).
 * Blocks without a match keep just their `query`, which the UI shows as a search link.
 */
export async function attachVideos(content) {
  return Promise.all(
    content.map(async (block) => {
      if (block.type !== 'video') return block;
      const video = await findVideo(block.query);
      return video ? { ...block, video } : block;
    }),
  );
}
