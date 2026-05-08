'use client';

import { useState } from 'react';

import { exportRecipesZip } from '@/lib/export/backup';

export function ExportSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('Export creates a ZIP with Markdown recipes and a complete JSON backup.');

  async function handleExport() {
    try {
      setIsExporting(true);
      const count = await exportRecipesZip();

      setMessage(`Exported ${count} recipe${count === 1 ? '' : 's'} to ZIP.`);
    } catch {
      setMessage('Recipe export failed.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <article className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Export recipes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Download a portable archive for Google Drive or any other file-based workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isExporting}
          className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Download ZIP'}
        </button>
      </div>
      <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
        {message}
      </p>
    </article>
  );
}
