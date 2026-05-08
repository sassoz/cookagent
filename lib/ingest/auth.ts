export const ingestTokenHeaderName = 'x-cookagent-ingest-token';

const ingestTokenStorageKey = 'cookagent.ingestToken';

export function readStoredIngestToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(ingestTokenStorageKey) ?? '';
}

export function storeIngestToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedToken = token.trim();

  if (trimmedToken.length === 0) {
    window.localStorage.removeItem(ingestTokenStorageKey);
    return;
  }

  window.localStorage.setItem(ingestTokenStorageKey, trimmedToken);
}

export function ingestAuthHeaders(): HeadersInit {
  const token = readStoredIngestToken();

  return token.length === 0 ? {} : { [ingestTokenHeaderName]: token };
}
