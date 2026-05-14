'use client';

import { type ChangeEvent, useRef, useState } from 'react';

import { exportRecipesZip } from '@/lib/export/backup';
import { importRecipesBackupText } from '@/lib/export/importBackup';

export function ExportSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('Export creates a ZIP with Markdown recipes and a complete JSON backup.');
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file === undefined) {
      return;
    }

    try {
      setIsImporting(true);
      const result = await importRecipesBackupText(await file.text());

      setMessage(`Imported ${result.importedCount} recipe${result.importedCount === 1 ? '' : 's'} from backup.`);
    } catch {
      setMessage('Recipe import failed. Choose the cookagent-backup.json file from a Cookagent export.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
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
          disabled={isExporting || isImporting}
          className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : 'Download ZIP'}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Import backup</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Restore recipes from the `cookagent-backup.json` file inside an export ZIP. Matching IDs are updated.
          </p>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={isExporting || isImporting}
          className="h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isImporting ? 'Importing...' : 'Choose JSON'}
        </button>
      </div>
      <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
        {message}
      </p>
    </article>
  );
}
