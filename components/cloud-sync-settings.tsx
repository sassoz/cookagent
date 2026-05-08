'use client';

import { useEffect, useState } from 'react';

import {
  pullCloudRecipesToLocal,
  pushLocalRecipesToCloud,
} from '@/lib/sync/cloudSync';
import { readStoredSyncToken, storeSyncToken } from '@/lib/sync/auth';

type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'syncing';

export function CloudSyncSettings() {
  const [syncToken, setSyncToken] = useState('');
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState<string>('Cloud sync uses the server database when DATABASE_URL is configured.');
  const isBusy = status !== 'idle';

  useEffect(() => {
    setSyncToken(readStoredSyncToken());
  }, []);

  async function runSync(action: SyncStatus, task: () => Promise<string>) {
    try {
      setStatus(action);
      setMessage(await task());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud sync failed.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <article className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Cloud recipe sync</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Keep Dexie as the offline store and mirror recipes to Postgres for sharing across your devices.
          </p>
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase text-emerald-900">
          Local-first
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-stone-700 sm:col-span-3">
          <span>Sync token</span>
          <input
            type="password"
            value={syncToken}
            onChange={(event) => {
              setSyncToken(event.target.value);
              storeSyncToken(event.target.value);
            }}
            placeholder="Enter the shared sync token for this device"
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void runSync('syncing', async () => {
              const pulled = await pullCloudRecipesToLocal();
              const pushed = await pushLocalRecipesToCloud();

              return `Sync complete. Pulled ${pulled} cloud update${pulled === 1 ? '' : 's'} and pushed ${pushed} local recipe${pushed === 1 ? '' : 's'}.`;
            })
          }
          className="h-10 rounded-md bg-brand px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'syncing' ? 'Syncing...' : 'Sync now'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void runSync('pulling', async () => {
              const count = await pullCloudRecipesToLocal();

              return `Pulled ${count} newer recipe${count === 1 ? '' : 's'} from cloud sync.`;
            })
          }
          className="h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'pulling' ? 'Pulling...' : 'Pull from cloud'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void runSync('pushing', async () => {
              const count = await pushLocalRecipesToCloud();

              return `Pushed ${count} local recipe${count === 1 ? '' : 's'} to cloud sync.`;
            })
          }
          className="h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'pushing' ? 'Pushing...' : 'Push local'}
        </button>
      </div>

      <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
        {message}
      </p>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Saves and deletes also attempt a background cloud update. If the database is unavailable, the local recipe still stays saved offline.
      </p>
    </article>
  );
}
