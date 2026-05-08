import { ingestTokenHeaderName } from '@/lib/ingest/auth';

export function isIngestAuthorized(request: Request): boolean {
  const configuredToken = process.env.COOKAGENT_INGEST_TOKEN?.trim();

  if (configuredToken === undefined || configuredToken.length === 0) {
    return false;
  }

  return request.headers.get(ingestTokenHeaderName)?.trim() === configuredToken;
}
