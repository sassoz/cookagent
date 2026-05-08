import { CloudSyncSettings } from '@/components/cloud-sync-settings';
import { ExportSettings } from '@/components/export-settings';
import { IngestAccessSettings } from '@/components/ingest-access-settings';

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">Preferences</p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
          Configure cloud sync, ingestion provider choices, and kitchen-friendly defaults without giving up offline access.
        </p>
      </div>

      <ExportSettings />
      <CloudSyncSettings />
      <IngestAccessSettings />

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-md border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-stone-900">Storage model</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Storage</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Dexie remains the offline database on each device.</p>
            </div>
            <div className="rounded-md bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Cloud</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Postgres stores shared recipe JSON behind server API routes.</p>
            </div>
            <div className="rounded-md bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">AI provider</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Local model first, with an OpenAI-compatible fallback path later.</p>
            </div>
            <div className="rounded-md bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Reading defaults</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Keep screen awake, larger kitchen text, and compact print layouts.</p>
            </div>
          </div>
        </article>

        <article className="rounded-md border border-emerald-900/10 bg-emerald-950 p-6 text-emerald-50 shadow-sm">
          <h2 className="text-xl font-semibold">Design principle</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-100/85">
            The app should stay dependable offline and transparent about when AI touched a recipe draft.
          </p>
        </article>
      </div>
    </section>
  );
}
