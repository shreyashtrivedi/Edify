import { ExternalLink, Play, Search } from 'lucide-react';
import { useState } from 'react';
import { formatDuration } from '../../utils/format';
import { youtubeSearchUrl } from '../../utils/paths';

// YouTube ids are exactly 11 URL-safe characters. Checking this means nothing unexpected
// can ever be placed into the iframe's URL.
const isValidVideoId = (id) => /^[\w-]{11}$/.test(id ?? '');

/**
 * A video block. The AI only writes a search query; the server resolves it to a real
 * YouTube video (`video`) when the lesson is generated.
 *
 * "Lite embed": we first show only the thumbnail. The real YouTube player (~1 MB of
 * scripts, plus tracking cookies) loads when the learner clicks play. This keeps lessons
 * fast, and youtube-nocookie.com avoids cookies until playback starts.
 */
export default function VideoBlock({ query, video }) {
  if (!video || !isValidVideoId(video.videoId)) return <VideoSearchLink query={query} />;
  return <YouTubeVideo video={video} query={query} />;
}

function YouTubeVideo({ video, query }) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <figure className="my-8">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-sm">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title || 'Lesson video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 size-full"
          >
            <img src={thumbnail} alt="" className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
              </span>
            </span>
            {video.durationSeconds > 0 && (
              <span className="absolute right-3 bottom-3 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
                {formatDuration(video.durationSeconds)}
              </span>
            )}
            <span className="sr-only">Play video: {video.title}</span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{video.title}</p>
          {video.channel && <p className="mt-0.5 text-sm text-muted">{video.channel}</p>}
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted hover:text-ink"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> YouTube
          </a>
          <a
            href={youtubeSearchUrl(query)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted hover:text-ink"
          >
            <Search className="size-3.5" aria-hidden="true" /> More videos
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

/** Fallback when no video could be found (no API key, quota used up, no results). */
function VideoSearchLink({ query }) {
  return (
    <a
      href={youtubeSearchUrl(query)}
      target="_blank"
      rel="noreferrer"
      className="group my-6 flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-red-300 dark:hover:border-red-900"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
        <Play className="size-5 fill-current" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
          Find a video on YouTube
        </span>
        <span className="block truncate font-medium text-ink">{query}</span>
      </span>
      <ExternalLink className="size-4 text-muted group-hover:text-ink" aria-hidden="true" />
    </a>
  );
}
