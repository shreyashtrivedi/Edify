import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "React Hooks · Edify". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Edify` : 'Edify · Text-to-Learn';
  }, [title]);
}
