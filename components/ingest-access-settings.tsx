'use client';

import { useEffect, useState } from 'react';

import { readStoredIngestToken, storeIngestToken } from '@/lib/ingest/auth';

export function IngestAccessSettings() {
  const [ingestToken, setIngestToken] = useState('');

  useEffect(() => {
    setIngestToken(readStoredIngestToken());
  }, []);

  return (
    <article className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Ingest access</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Protect AI extraction with a server-side token so only authorized devices can use provider credits.
          </p>
        </div>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold uppercase text-amber-900">
          Protected API
        </span>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-medium text-stone-700">
        <span>Ingest token</span>
        <input
          type="password"
          value={ingestToken}
          onChange={(event) => {
            setIngestToken(event.target.value);
            storeIngestToken(event.target.value);
          }}
          placeholder="Enter the shared ingest token for this device"
          className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Without this token, the ingest API returns 401 before it calls the LLM provider.
      </p>
    </article>
  );
}
