export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">Preferences</p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
          The app is still local-only, so settings focus on the future backup model, ingestion provider choices, and
          kitchen-friendly defaults.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-stone-900">Upcoming controls</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Storage</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Dexie-powered local database with human-readable backup export.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">AI provider</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Local model first, with an OpenAI-compatible fallback path later.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Reading defaults</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Keep screen awake, larger kitchen text, and compact print layouts.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-600">Import/export</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">Recipe JSON backup and restore before any sync feature is introduced.</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-emerald-900/10 bg-emerald-950 p-6 text-emerald-50 shadow-sm">
          <h2 className="text-xl font-semibold">Design principle</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-100/85">
            The app should stay dependable offline and transparent about when AI touched a recipe draft.
          </p>
        </article>
      </div>
    </section>
  );
}
