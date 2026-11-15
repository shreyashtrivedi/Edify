import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

const SIZES = {
  sm: 'rounded-lg px-3 py-1.5',
  md: 'rounded-xl px-4 py-2.5 font-medium',
};

/**
 * Button that runs an async PDF export and shows its progress.
 * `onDownload` does the work (load the PDF code, fetch data, render, save).
 */

export default function DownloadPdfButton({ onDownload, label = 'Download PDF', disabled = false, title, size = 'sm' }) {
  const [state, setState] = useState('idle'); // idle | working | error

  async function handleClick() {
    setState('working');
    try {
      await onDownload();
      setState('idle');
    } catch (error) {
      console.error('PDF export failed', error);
      setState('error');
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === 'working'}
        title={title}
        className={`inline-flex items-center gap-1.5 border border-line text-sm ${SIZES[size]} text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-muted`}
      >
        {state === 'working' ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {state === 'working' ? 'Preparing PDF…' : label}
      </button>
      {state === 'error' && (
        <span className="text-xs text-red-600" role="alert">
          Couldn&apos;t create the PDF. Please try again.
        </span>
      )}
    </span>
  );
}
