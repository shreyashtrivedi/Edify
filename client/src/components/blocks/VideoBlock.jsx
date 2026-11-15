import { ExternalLink, Play } from 'lucide-react';
import { youtubeSearchUrl } from '../../utils/paths';

/**
 * The AI gives a *search query* (never a URL, since AI-invented video links are usually dead).
 * For now we link to YouTube search results; the YouTube Data API integration will turn
 * this into an embedded player and keep the link as a fallback.
 */
export default function VideoBlock({ query }) {
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
          Recommended video
        </span>
        <span className="block truncate font-medium text-ink">{query}</span>
      </span>
      <ExternalLink className="size-4 text-muted group-hover:text-ink" aria-hidden="true" />
    </a>
  );
}
