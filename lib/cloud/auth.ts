import { syncTokenHeaderName } from '@/lib/sync/auth';

export function isCloudSyncAuthorized(request: Request): boolean {
  const configuredToken = process.env.COOKAGENT_SYNC_TOKEN?.trim();

  if (configuredToken === undefined || configuredToken.length === 0) {
    return false;
  }

  return request.headers.get(syncTokenHeaderName)?.trim() === configuredToken;
}
