import mongoose from 'mongoose';

/**
 * Cache of YouTube search results, keyed by the normalised search query.
 *
 * A YouTube search costs 100 of the 10,000 free daily quota units, i.e. only ~100 searches
 * a day. Similar lessons often produce the same query, so each query is searched ONCE and
 * every later lesson reuses the stored answer for free.
 *
 * `video: null` records "YouTube had nothing suitable", so we don't keep re-asking.
 * MongoDB deletes each entry automatically at `expiresAt` (a TTL index), so videos that are
 * removed from YouTube eventually get replaced.
 */
const videoSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true },
    title: String,
    channel: String,
    thumbnail: String,
    durationSeconds: Number,
  },
  { _id: false },
);

const videoCacheSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, unique: true },
    video: { type: videoSchema, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// expireAfterSeconds: 0 → delete the document as soon as `expiresAt` has passed.
videoCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VideoCache = mongoose.model('VideoCache', videoCacheSchema);
