import { useSyncExternalStore } from 'react';
import { getServerStatus, subscribeToServerStatus } from '../utils/serverStatus';

/**
 * The API's live status: 'checking' | 'waking' | 'online' | 'offline'.
 * Every component reads the same shared check (see utils/serverStatus.js), so the API is
 * pinged once per page load, not once per component.
 */
export function useServerStatus() {
  return useSyncExternalStore(subscribeToServerStatus, getServerStatus);
}
