export const syncTokenHeaderName = 'x-cookagent-sync-token';

const syncTokenStorageKey = 'cookagent.syncToken';

export function readStoredSyncToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(syncTokenStorageKey) ?? '';
}

export function storeSyncToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedToken = token.trim();

  if (trimmedToken.length === 0) {
    window.localStorage.removeItem(syncTokenStorageKey);
    return;
  }

  window.localStorage.setItem(syncTokenStorageKey, trimmedToken);
}

export function syncAuthHeaders(): HeadersInit {
  const token = readStoredSyncToken();

  return token.length === 0 ? {} : { [syncTokenHeaderName]: token };
}
